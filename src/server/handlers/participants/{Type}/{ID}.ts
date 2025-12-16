import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
import { Context } from '~/server/plugins'
import { createParticipantController } from '~/domain/createParticipantController'

export async function get(_context: Context, request: Request, h: ResponseToolkit): Promise<ResponseObject> {
  const { Type, ID } = request.params

  const controller = createParticipantController(request.server.app)
  const subType = request.query?.partySubIdOrType
  const { result, statusCode } = subType
    ? await controller.handleGetPartyById(Type, ID, subType)
    : await controller.handleGetPartyById(Type, ID)

  return h.response(result).code(statusCode)
}

export default {
  get
}
