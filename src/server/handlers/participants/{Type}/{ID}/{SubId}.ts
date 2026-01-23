import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
import { Context } from '~/server/plugins'
import { createParticipantController } from '~/domain/createParticipantController'

export async function get(_context: Context, request: Request, h: ResponseToolkit): Promise<ResponseObject> {
  const { Type, ID, SubId } = request.params

  const { result, statusCode } = await createParticipantController(request.server.app).handleGetPartyById(
    Type,
    ID,
    SubId
  )

  return h.response(result).code(statusCode)
}

export default {
  get
}
