/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Vijay Kumar Guthi <vijaya.guthi@infitx.com>
 *****/

import { ILogger } from './types'

/**
 * Matching modes for rule evaluation
 */
export type MatchMode = 'EXACT' | 'PREFIX' | 'REGEX' | 'ANY'

/**
 * Field matcher configuration
 */
export interface FieldMatcher {
  mode: MatchMode
  value?: string
}

/**
 * Match criteria for a routing rule
 */
export interface RuleMatch {
  type: string
  id: FieldMatcher
  subId?: FieldMatcher
}

/**
 * Result returned when a rule matches
 */
export interface RuleResult {
  dfspId: string
}

/**
 * Decision table rule (authoring format)
 */
export interface RoutingRule {
  ruleId?: string
  priority?: number
  description?: string
  match: RuleMatch
  result: RuleResult
  validity?: {
    from?: string
    to?: string
  }
}

/**
 * Decision table configuration
 */
export interface DecisionTable {
  version?: string
  rules: RoutingRule[]
}

/**
 * Prefix trie node for fast prefix matching
 */
type PrefixTrieNode = {
  _dfsp?: string
} & {
  [char: string]: PrefixTrieNode
}

/**
 * Compiled lookup bucket for a specific type/subId combination
 */
interface LookupBucket {
  exact: Map<string, string>
  prefixTrie: PrefixTrieNode
  regexRules: Array<{ pattern: RegExp; dfspId: string }>
  default: string | null
}

/**
 * Compiled routing structure for fast lookups
 * Organized as: type -> subId -> lookup methods
 */
interface CompiledRoutes {
  [type: string]: {
    [subId: string]: LookupBucket
  }
}

/**
 * High-performance routing engine that compiles decision tables
 * into optimized lookup structures (maps, prefix tries, regex arrays)
 */
export class RoutingEngine {
  private compiled: CompiledRoutes = {}
  private readonly log: ILogger

  constructor(
    private readonly decisionTable: DecisionTable,
    logger: ILogger
  ) {
    this.log = logger.child({ component: RoutingEngine.name })
    this.compile()
  }

  /**
   * Compile the decision table into optimized runtime structures
   */
  private compile(): void {
    const startTime = Date.now()
    this.log.info('Compiling routing decision table...')

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...this.decisionTable.rules].sort((a, b) => {
      const priorityA = a.priority ?? 9999
      const priorityB = b.priority ?? 9999
      return priorityA - priorityB
    })

    // Build optimized lookup structures
    for (const rule of sortedRules) {
      const type = rule.match.type
      const subIdValue = this.getSubIdKey(rule.match.subId)

      // Initialize type bucket if needed
      if (!this.compiled[type]) {
        this.compiled[type] = {}
      }

      // Initialize subId bucket if needed
      if (!this.compiled[type][subIdValue]) {
        this.compiled[type][subIdValue] = {
          exact: new Map(),
          prefixTrie: {},
          regexRules: [],
          default: null
        }
      }

      const bucket = this.compiled[type][subIdValue]
      this.compileRule(rule, bucket)
    }

    const elapsed = Date.now() - startTime
    const stats = this.getStats()

    this.log.info(`Routing table compiled in ${elapsed}ms`, {
      types: Object.keys(this.compiled).length,
      totalRules: sortedRules.length,
      exactRules: stats.totalExactRules,
      prefixRules: stats.totalPrefixRules,
      regexRules: stats.totalRegexRules,
      defaultRules: stats.totalDefaultRules
    })
  }

  /**
   * Compile a single rule into the appropriate lookup structure
   */
  private compileRule(rule: RoutingRule, bucket: LookupBucket): void {
    const idMatcher = rule.match.id
    const dfspId = rule.result.dfspId

    switch (idMatcher.mode) {
      case 'EXACT':
        if (idMatcher.value && !bucket.exact.has(idMatcher.value)) {
          bucket.exact.set(idMatcher.value, dfspId)
        }
        break

      case 'PREFIX':
        if (idMatcher.value) {
          this.insertPrefix(bucket.prefixTrie, idMatcher.value, dfspId)
        }
        break

      case 'REGEX':
        if (idMatcher.value) {
          try {
            const pattern = new RegExp(idMatcher.value)
            bucket.regexRules.push({ pattern, dfspId })
          } catch (err) {
            this.log.warn(`Invalid regex pattern: ${idMatcher.value}`, err)
          }
        }
        break

      case 'ANY':
        if (!bucket.default) {
          bucket.default = dfspId
        }
        break
    }
  }

  /**
   * Insert a prefix pattern into the trie
   */
  private insertPrefix(trie: PrefixTrieNode, prefix: string, dfspId: string): void {
    let node = trie
    for (const char of prefix) {
      if (!node[char]) {
        node[char] = {}
      }
      node = node[char] as PrefixTrieNode
    }
    if (!node._dfsp) {
      node._dfsp = dfspId
    }
  }

  /**
   * Get the subId key for bucket lookup
   * Returns '_any' for wildcard, otherwise the exact value or mode indicator
   */
  private getSubIdKey(subId?: FieldMatcher): string {
    if (!subId || subId.mode === 'ANY') {
      return '_any'
    }
    // For EXACT subId matches, use the value as key
    if (subId.mode === 'EXACT' && subId.value) {
      return subId.value
    }
    // For other modes, use a special key (could be extended later)
    return '_any'
  }

  /**
   * Resolve a participant ID to a DFSP using the compiled routing table
   * This is the fast-path lookup function
   */
  resolve(type: string, id: string, subId?: string): string | null {
    const typeBucket = this.compiled[type]
    if (!typeBucket) {
      this.log.debug(`No routes found for type: ${type}`)
      return null
    }

    // Try exact subId match first, then fallback to wildcard
    const subIdKey = subId || '_any'
    const bucket = typeBucket[subIdKey] || typeBucket['_any']

    if (!bucket) {
      this.log.debug(`No routes found for type: ${type}, subId: ${subIdKey}`)
      return null
    }

    return this.lookupInBucket(bucket, id, type, subId)
  }

  /**
   * Perform lookup within a specific bucket
   * Order: EXACT -> PREFIX -> REGEX -> DEFAULT
   */
  private lookupInBucket(bucket: LookupBucket, id: string, type: string, subId?: string): string | null {
    // 1. Try exact match (O(1))
    const exactMatch = bucket.exact.get(id)
    if (exactMatch) {
      this.log.debug('Resolved via EXACT match', { type, id, subId, dfspId: exactMatch })
      return exactMatch
    }

    // 2. Try prefix match (O(k) where k = id length)
    const prefixMatch = this.longestPrefixMatch(bucket.prefixTrie, id)
    if (prefixMatch) {
      this.log.debug('Resolved via PREFIX match', { type, id, subId, dfspId: prefixMatch })
      return prefixMatch
    }

    // 3. Try regex matches (O(n) where n = number of regex rules)
    for (const { pattern, dfspId } of bucket.regexRules) {
      if (pattern.test(id)) {
        this.log.debug('Resolved via REGEX match', { type, id, subId, dfspId, pattern: pattern.source })
        return dfspId
      }
    }

    // 4. Fallback to default (O(1))
    if (bucket.default) {
      this.log.debug('Resolved via DEFAULT match', { type, id, subId, dfspId: bucket.default })
      return bucket.default
    }

    this.log.debug('No match found', { type, id, subId })
    return null
  }

  /**
   * Find the longest prefix match in the trie
   */
  private longestPrefixMatch(trie: PrefixTrieNode, value: string): string | null {
    let node: PrefixTrieNode = trie
    let lastMatch: string | null = null

    for (const char of value) {
      const next = node[char]
      if (!next || typeof next === 'string') {
        break
      }
      node = next
      if (node._dfsp) {
        lastMatch = node._dfsp
      }
    }

    return lastMatch
  }

  /**
   * Get statistics about the compiled routing table.
   */
  getStats(): {
    types: number
    totalExactRules: number
    totalPrefixRules: number
    totalRegexRules: number
    totalDefaultRules: number
  } {
    let totalExact = 0
    let totalPrefix = 0
    let totalRegex = 0
    let totalDefault = 0

    for (const type of Object.values(this.compiled)) {
      for (const bucket of Object.values(type)) {
        totalExact += bucket.exact.size
        totalPrefix += this.countTrieNodes(bucket.prefixTrie)
        totalRegex += bucket.regexRules.length
        if (bucket.default) totalDefault += 1
      }
    }

    return {
      types: Object.keys(this.compiled).length,
      totalExactRules: totalExact,
      totalPrefixRules: totalPrefix,
      totalRegexRules: totalRegex,
      totalDefaultRules: totalDefault
    }
  }

  /**
   * Count the number of nodes in a prefix trie
   */
  private countTrieNodes(node: PrefixTrieNode): number {
    let count = node._dfsp ? 1 : 0
    for (const key of Object.keys(node)) {
      if (key !== '_dfsp') {
        const child = node[key]
        if (typeof child !== 'string') {
          count += this.countTrieNodes(child)
        }
      }
    }
    return count
  }
}
