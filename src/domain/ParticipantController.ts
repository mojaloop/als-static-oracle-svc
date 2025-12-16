import { ResponseValue } from '@hapi/hapi'
import { ILogger, IParticipantController, IParticipantService, ControllerResponse, ErrorResponse } from '~/domain/types'
import {
  CustomOracleError,
  IDTypeNotSupported,
  InternalServerError,
  MalformedParameterError,
  MissingParameterError
} from '~/model/errors'
import { SUPPORTED_PARTY_ID_TYPES } from '~/constants'

export type ParticipantControllerDeps = {
  logger: ILogger
  participantService: IParticipantService
}

export class ParticipantController implements IParticipantController {
  protected log: ILogger

  constructor(protected readonly deps: ParticipantControllerDeps) {
    this.log = deps.logger.child({ component: this.constructor.name })
  }

  async handleGetPartyById(partyType: string, partyId: string, subId?: string) {
    try {
      // Validate input parameters
      arguments.length === 2
        ? this.validateRequestParams(partyType, partyId)
        : this.validateRequestParamsWithSubId(partyType, partyId, subId)

      const party = await this.deps.participantService.retrieveOneParty(partyId, subId)
      const partyList = party ? [party] : []
      this.log.info('handleGetPartyById is done: ', { partyList, partyId, subId })
      return this.formatSuccessResponse({ partyList })
    } catch (err) {
      return this.formatErrorResponse('error in handleGetPartyById: ', err)
    }
  }

  validateRequestParams(partyType: string, partyId: string /*, subId?: string*/): boolean {
    // todo: use Joi to validate input
    if (!SUPPORTED_PARTY_ID_TYPES.includes(partyType as any)) {
      throw new IDTypeNotSupported()
    }
    if (!partyId) {
      throw new MissingParameterError('ID parameter is missing')
    }
    if (partyId === '{ID}' || partyId.includes('{') || partyId.includes('}')) {
      throw new MalformedParameterError(`Invalid ID parameter: ${partyId}`)
    }

    return true
  }

  validateRequestParamsWithSubId(partyType: string, partyId: string, subId?: string): boolean {
    this.validateRequestParams(partyType, partyId)

    if (!subId) {
      throw new MissingParameterError('SubId parameter is missing')
    }
    if (subId === '{SubId}' || subId.includes('{') || subId.includes('}')) {
      throw new MalformedParameterError(`Invalid SubId parameter: ${subId}`)
    }

    return true
  }

  protected formatSuccessResponse<T = ResponseValue>(result: T, statusCode = 200): ControllerResponse<T> {
    const response = {
      result,
      statusCode
    }
    this.log.verbose('formatSuccessResponse is done: ', { response })
    return response
  }

  protected formatErrorResponse(message: string, cause: unknown): ControllerResponse<ErrorResponse> {
    this.log.error(message, cause)
    const error = cause instanceof CustomOracleError ? cause : new InternalServerError(message, { cause })
    const { errorInformation, statusCode } = error

    const response = {
      result: { errorInformation },
      statusCode
    }
    this.log.verbose('formatErrorResponse is done: ', { response })
    return response
  }
}
