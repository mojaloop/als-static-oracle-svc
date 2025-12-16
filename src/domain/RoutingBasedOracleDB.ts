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

import { IOracleDb, PartyMapItem, ILogger } from './types'
import { NotFoundError } from '~/model/errors'
import { RoutingEngine } from './RoutingEngine'

/**
 * Routing-based Oracle DB implementation (Read-Only)
 * Uses the routing engine to resolve party IDs to DFSPs based on static configuration
 */
export class RoutingBasedOracleDB implements IOracleDb {
  private readonly log: ILogger

  constructor(
    private readonly routingEngine: RoutingEngine,
    logger: ILogger
  ) {
    this.log = logger.child({ component: RoutingBasedOracleDB.name })
  }

  /**
   * Retrieve a party map item using the routing engine
   */
  async retrieve(id: string, subId?: string): Promise<PartyMapItem> {
    // Use routing engine to resolve the party ID to a DFSP
    const dfspId = this.routingEngine.resolve('MSISDN', id, subId)

    if (!dfspId) {
      throw new NotFoundError('oracleMSISDN', id)
    }

    this.log.debug('Retrieved party from routing engine', { id, subId, dfspId })

    const item: PartyMapItem = {
      id,
      fspId: dfspId
    }

    if (subId) {
      item.subId = subId
    }

    return item
  }

  /**
   * Check if the service is connected (always true for routing engine)
   */
  async isConnected(): Promise<boolean> {
    this.log.verbose('Routing-based oracle is always connected')
    return true
  }

  /**
   * Get statistics about the routing engine
   */
  getStats(): any {
    return this.routingEngine.getStats()
  }
}
