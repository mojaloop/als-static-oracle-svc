/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 *****/

import { RoutingEngine } from '~/domain/RoutingEngine'
import { logger } from '~/shared/logger'

describe('RoutingEngine', (): void => {
  describe('Compilation and Initialization', (): void => {
    it('should compile empty rules', (): void => {
      const engine = new RoutingEngine({ rules: [] }, logger)
      expect(engine).toBeDefined()

      const stats = engine.getStats()
      expect(stats.types).toBe(0)
      expect(stats.totalExactRules).toBe(0)
    })

    it('should compile EXACT match rules', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123456789' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '123456789')
      expect(result).toBe('dfsp1')

      const stats = engine.getStats()
      expect(stats.totalExactRules).toBe(1)
    })

    it('should compile PREFIX match rules', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R010',
              priority: 10,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '91' }
              },
              result: { dfspId: 'dfspindia' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '919876543210')
      expect(result).toBe('dfspindia')

      const stats = engine.getStats()
      expect(stats.totalPrefixRules).toBe(1)
    })

    it('should compile REGEX match rules', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R020',
              priority: 20,
              match: {
                type: 'MSISDN',
                id: { mode: 'REGEX', value: '^999[0-9]{7}$' }
              },
              result: { dfspId: 'dfsp_test' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '9991234567')
      expect(result).toBe('dfsp_test')

      const stats = engine.getStats()
      expect(stats.totalRegexRules).toBe(1)
    })

    it('should compile ANY match rules (default)', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R999',
              priority: 999,
              match: {
                type: 'MSISDN',
                id: { mode: 'ANY' }
              },
              result: { dfspId: 'dfsp_default' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', 'anything')
      expect(result).toBe('dfsp_default')

      const stats = engine.getStats()
      expect(stats.totalDefaultRules).toBe(1)
    })

    it('should handle invalid regex patterns gracefully', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R_INVALID',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'REGEX', value: '[invalid(' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      // Should not throw, just skip invalid regex
      const result = engine.resolve('MSISDN', 'test')
      expect(result).toBeNull()
    })
  })

  describe('Priority-based matching', (): void => {
    it('should respect priority order (lower = higher)', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R010',
              priority: 10,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '91' }
              },
              result: { dfspId: 'dfsp_india' }
            },
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '919876543210' }
              },
              result: { dfspId: 'dfsp_special' }
            }
          ]
        },
        logger
      )

      // Exact match (priority 1) should win over prefix (priority 10)
      const result = engine.resolve('MSISDN', '919876543210')
      expect(result).toBe('dfsp_special')
    })

    it('should use default priority when not specified', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              // No priority specified, should default to 9999
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' }
              },
              result: { dfspId: 'dfsp1' }
            },
            {
              ruleId: 'R002',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '456' }
              },
              result: { dfspId: 'dfsp2' }
            }
          ]
        },
        logger
      )

      const result1 = engine.resolve('MSISDN', '123')
      expect(result1).toBe('dfsp1')

      const result2 = engine.resolve('MSISDN', '456')
      expect(result2).toBe('dfsp2')
    })
  })

  describe('Lookup order (EXACT > PREFIX > REGEX > DEFAULT)', (): void => {
    it('should prefer EXACT over PREFIX', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '91' }
              },
              result: { dfspId: 'dfsp_prefix' }
            },
            {
              ruleId: 'R002',
              priority: 2,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '919876543210' }
              },
              result: { dfspId: 'dfsp_exact' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '919876543210')
      expect(result).toBe('dfsp_exact')
    })

    it('should use PREFIX when EXACT not found', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '91' }
              },
              result: { dfspId: 'dfsp_prefix' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '919999999999')
      expect(result).toBe('dfsp_prefix')
    })

    it('should use REGEX when EXACT and PREFIX not found', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'REGEX', value: '^999.*' }
              },
              result: { dfspId: 'dfsp_regex' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '9991234567')
      expect(result).toBe('dfsp_regex')
    })

    it('should use DEFAULT when no other match found', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' }
              },
              result: { dfspId: 'dfsp_exact' }
            },
            {
              ruleId: 'R999',
              priority: 999,
              match: {
                type: 'MSISDN',
                id: { mode: 'ANY' }
              },
              result: { dfspId: 'dfsp_default' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', 'nomatch')
      expect(result).toBe('dfsp_default')
    })

    it('should return null when no match found', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '456')
      expect(result).toBeNull()
    })

    it('should return null for non-existent type', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('EMAIL', 'test@example.com')
      expect(result).toBeNull()
    })
  })

  describe('SubId matching', (): void => {
    it('should match exact subId', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'ANY' },
                subId: { mode: 'EXACT', value: 'HOME' }
              },
              result: { dfspId: 'dfsp_home' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '123', 'HOME')
      expect(result).toBe('dfsp_home')
    })

    it('should fallback to wildcard subId when exact not found', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' }
              },
              result: { dfspId: 'dfsp_any' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('MSISDN', '123', 'WORK')
      expect(result).toBe('dfsp_any')
    })

    it('should handle ANY subId mode', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' },
                subId: { mode: 'ANY' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      const result1 = engine.resolve('MSISDN', '123', 'HOME')
      expect(result1).toBe('dfsp1')

      const result2 = engine.resolve('MSISDN', '123')
      expect(result2).toBe('dfsp1')
    })
  })

  describe('Prefix trie - longest match', (): void => {
    it('should find longest prefix match', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '91' }
              },
              result: { dfspId: 'dfsp_india' }
            },
            {
              ruleId: 'R002',
              priority: 2,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '9198' }
              },
              result: { dfspId: 'dfsp_india_specific' }
            }
          ]
        },
        logger
      )

      // Should match longer prefix
      const result = engine.resolve('MSISDN', '919876543210')
      expect(result).toBe('dfsp_india_specific')
    })

    it('should handle partial prefix matches', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'PREFIX', value: '9199' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      // '91' is only partial match, should not match
      const result = engine.resolve('MSISDN', '919876543210')
      expect(result).toBeNull()
    })
  })

  describe('Statistics', (): void => {
    it('should return accurate statistics', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: { type: 'MSISDN', id: { mode: 'EXACT', value: '123' } },
              result: { dfspId: 'dfsp1' }
            },
            {
              ruleId: 'R002',
              priority: 2,
              match: { type: 'MSISDN', id: { mode: 'EXACT', value: '456' } },
              result: { dfspId: 'dfsp2' }
            },
            {
              ruleId: 'R003',
              priority: 3,
              match: { type: 'MSISDN', id: { mode: 'PREFIX', value: '91' } },
              result: { dfspId: 'dfsp3' }
            },
            {
              ruleId: 'R004',
              priority: 4,
              match: { type: 'MSISDN', id: { mode: 'REGEX', value: '^999.*' } },
              result: { dfspId: 'dfsp4' }
            },
            {
              ruleId: 'R999',
              priority: 999,
              match: { type: 'MSISDN', id: { mode: 'ANY' } },
              result: { dfspId: 'dfsp_default' }
            }
          ]
        },
        logger
      )

      const stats = engine.getStats()
      expect(stats.types).toBe(1)
      expect(stats.totalExactRules).toBe(2)
      expect(stats.totalPrefixRules).toBe(1)
      expect(stats.totalRegexRules).toBe(1)
      expect(stats.totalDefaultRules).toBe(1)
    })
  })

  describe('Edge Cases and Error Handling', (): void => {
    it('should return null for unknown type', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123456789' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      const result = engine.resolve('UNKNOWN_TYPE', '123456789')
      expect(result).toBeNull()
    })

    it('should return null when no bucket found for subId combination', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' },
                subId: { mode: 'EXACT', value: 'specificSubId' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      // This should fail because there's no rule for type EMAIL
      const result = engine.resolve('EMAIL', '123', 'differentSubId')
      expect(result).toBeNull()
    })

    it('should handle subId with non-EXACT mode (coverage for line 246)', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' },
                subId: { mode: 'PREFIX', value: 'SUB' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      // Should match because PREFIX mode uses '_any' key
      const result = engine.resolve('MSISDN', '123', 'SUB123')
      expect(result).toBe('dfsp1')
    })

    it('should handle resolve with no matching bucket (coverage for line 265-266)', (): void => {
      const engine = new RoutingEngine(
        {
          rules: [
            {
              ruleId: 'R001',
              priority: 1,
              match: {
                type: 'MSISDN',
                id: { mode: 'EXACT', value: '123' },
                subId: { mode: 'EXACT', value: 'onlyThisSubId' }
              },
              result: { dfspId: 'dfsp1' }
            }
          ]
        },
        logger
      )

      // This should return null because we're looking for a different subId and there's no fallback
      const result = engine.resolve('MSISDN', '123', 'differentSubId')
      expect(result).toBeNull()
    })
  })
})
