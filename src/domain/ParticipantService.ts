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

 * Eugen Klymniuk <eugen.klymniuk@infitx.com>
 *****/

import { PartyTypeIdInfo } from '../interface/types'
import { ParticipantServiceDeps, ILogger, IParticipantService } from './types'
import { NotFoundError } from '~/model/errors'

export class ParticipantService implements IParticipantService {
  private readonly log: ILogger

  constructor(private readonly deps: ParticipantServiceDeps) {
    this.log = deps.logger.child({ component: ParticipantService.name })
  }

  async retrieveOneParty(partyType: string, id: string, subId?: string): Promise<PartyTypeIdInfo | null> {
    const log = this.log.child({ partyType, id, subId } as any)
    try {
      const partyMapItem = await this.deps.oracleDB.retrieve(partyType, id, subId)
      log.debug('retrieve partyMapItem from routing engine: ', { partyMapItem })

      const partyInfo: PartyTypeIdInfo = {
        fspId: partyMapItem.fspId,
        ...(partyMapItem.subId && { partySubIdOrType: partyMapItem.subId })
      }
      log.verbose('retrieveOneParty is done: ', { partyInfo })

      return partyInfo
    } catch (err: unknown) {
      if (err instanceof NotFoundError) {
        log.verbose('retrieveOneParty is done - no party found')
        return null
      }
      throw err
    }
  }
}
