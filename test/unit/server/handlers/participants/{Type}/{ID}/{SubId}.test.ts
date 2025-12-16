import { Request, ResponseToolkit, ServerApplicationState } from '@hapi/hapi'
import { Enum } from '@mojaloop/central-services-shared'
import * as Handler from '~/server/handlers/participants/{Type}/{ID}/{SubId}'
import { logger } from '~/shared/logger'
import { errorResponseDto } from 'test/fixtures'
import { h, getParticipantsByTypeAndIDRequestSubId, mockPartyMapItemSubId } from 'test/data/data'
import { IOracleDb } from '~/domain/types'
import { createMockOracleDb } from 'test/unit/__mocks__/util'

describe('server/handler/participants/{Type}/{ID}/{SubId}', (): void => {
  let oracleDB: IOracleDb
  let serverApp: ServerApplicationState // hapi server app state

  const mockHapiRequest = (reqDetails: any = {}): Request =>
    ({
      ...reqDetails,
      server: { app: serverApp }
    }) as unknown as Request

  beforeEach(() => {
    oracleDB = createMockOracleDb()
    serverApp = { logger, oracleDB }
  })

  describe('GET Handler', (): void => {
    beforeEach((): void => {
      oracleDB.retrieve = jest.fn().mockResolvedValue(mockPartyMapItemSubId)
    })

    it('should return a 200 success code.', async (): Promise<void> => {
      const req = mockHapiRequest(getParticipantsByTypeAndIDRequestSubId)
      const response = await Handler.get(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h as unknown as ResponseToolkit
      )
      expect(response.statusCode).toBe(Enum.Http.ReturnCodes.OK.CODE)
    })

    it('should return 400 validation error if {Type} is not supported', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequestSubId,
        params: { ...(getParticipantsByTypeAndIDRequestSubId.params as Record<string, any>) }
      })
      req.params.Type = 'UNSUPPORTED_TYPE'

      const response = await Handler.get(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h as unknown as ResponseToolkit
      )
      expect(response.statusCode).toBe(400)
      expect(response.source).toStrictEqual(
        errorResponseDto(
          '3101',
          'Malformed syntax - Unsupported ID type. Supported: MSISDN, EMAIL, PERSONAL_ID, BUSINESS, DEVICE, ACCOUNT_ID, IBAN, ALIAS'
        )
      )
    })

    it('should return 400 validation error if ID is a placeholder value {ID}', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequestSubId,
        params: { ...(getParticipantsByTypeAndIDRequestSubId.params as Record<string, any>) }
      })
      req.params.ID = '{ID}'

      const response = await Handler.get(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h as unknown as ResponseToolkit
      )
      expect(response.statusCode).toBe(400)
      expect(response.source).toStrictEqual(errorResponseDto('3101', 'Malformed syntax - Invalid ID parameter: {ID}'))
    })

    it('should return 400 validation error if SubId is undefined', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequestSubId,
        params: { ...(getParticipantsByTypeAndIDRequestSubId.params as Record<string, any>) }
      })
      delete req.params.SubId

      const response = await Handler.get(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h as unknown as ResponseToolkit
      )
      expect(response.statusCode).toBe(400)
    })

    it('should return 400 validation error if SubId is a placeholder value {SubId}', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequestSubId,
        params: { ...(getParticipantsByTypeAndIDRequestSubId.params as Record<string, any>) }
      })
      req.params.SubId = '{SubId}'

      const response = await Handler.get(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h as unknown as ResponseToolkit
      )
      expect(response.statusCode).toBe(400)
      expect(response.source).toStrictEqual(
        errorResponseDto('3101', 'Malformed syntax - Invalid SubId parameter: {SubId}')
      )
    })
  })
})
