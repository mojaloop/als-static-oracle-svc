import { Logger } from '@mojaloop/sdk-standard-components'
import { ResponseValue } from '@hapi/hapi'
import { ErrorInformation, ParticipantsTypeIDGetResponse, PartyTypeIdInfo } from '~/interface/types'

export type ILogger = Logger.SdkLogger // add type alias for Logger

export type IParticipantController = {
  handleGetPartyById(
    partyType: string,
    partyId: string,
    subId?: string
  ): Promise<ControllerResponse<ParticipantsTypeIDGetResponse>>
}

// todo: optimize this type declaration
export type ControllerResponse<T = ResponseValue> =
  | {
      result: T
      statusCode: number
    }
  | {
      result: ErrorResponse
      statusCode: number
    }

export type ErrorResponse = {
  errorInformation: ErrorInformation
}

export type IParticipantService = {
  retrieveOneParty(partyType: string, id: string, subId?: string): Promise<PartyTypeIdInfo | null>
}

export type ParticipantServiceDeps = {
  oracleDB: IOracleDb
  logger: ILogger
}

/*
 * Interface for PartyMapItem resource type
 */
export interface PartyMapItem {
  id: string
  subId?: string
  fspId: string
}

export type IOracleDb = {
  retrieve(partyType: string, id: string, subId?: string): Promise<PartyMapItem>
  isConnected(): Promise<boolean>
}
