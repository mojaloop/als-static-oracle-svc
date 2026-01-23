import { Request, ResponseToolkit, ServerApplicationState } from '@hapi/hapi'
import { Enum } from '@mojaloop/central-services-shared'
import * as Handler from '~/server/handlers/participants/{Type}/{ID}'
import { logger } from '~/shared/logger'
import { createMockOracleDb } from 'test/unit/__mocks__/util'
import { errorResponseDto } from 'test/fixtures'
import { h, getParticipantsByTypeAndIDRequest, mockPartyMapItem } from 'test/data/data'
import { IOracleDb } from '~/domain/types'
import { NotFoundError } from '~/model/errors'

describe('server/handler/participants/{Type}/{ID}', (): void => {
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
      oracleDB.retrieve = jest.fn().mockResolvedValue(mockPartyMapItem)
    })

    it('should return 400 validation error if ID is empty string', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequest,
        params: { ...(getParticipantsByTypeAndIDRequest.params as Record<string, any>) }
      })
      req.params.ID = ''

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

    it('should return 400 validation error if ID is undefined', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequest,
        params: { ...(getParticipantsByTypeAndIDRequest.params as Record<string, any>) }
      })
      delete req.params.ID

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

    it('should return a 200 success code.', async (): Promise<void> => {
      const req = mockHapiRequest(getParticipantsByTypeAndIDRequest)
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

    it('should handle query parameter partySubIdOrType', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequest,
        query: { partySubIdOrType: 'subId123' }
      })
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

    it('should return empty partyList when retrieve throws NotFoundError', async (): Promise<void> => {
      oracleDB.retrieve = jest.fn().mockRejectedValueOnce(new NotFoundError('oracleMSISDN', '999'))
      const req = mockHapiRequest(getParticipantsByTypeAndIDRequest)
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
        ...getParticipantsByTypeAndIDRequest,
        params: { ...(getParticipantsByTypeAndIDRequest.params as Record<string, any>) }
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
        ...getParticipantsByTypeAndIDRequest,
        params: { ...(getParticipantsByTypeAndIDRequest.params as Record<string, any>) }
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

    it('should return 400 validation error if ID contains curly braces', async (): Promise<void> => {
      const req = mockHapiRequest({
        ...getParticipantsByTypeAndIDRequest,
        params: { ...(getParticipantsByTypeAndIDRequest.params as Record<string, any>) }
      })
      req.params.ID = 'some{value}'

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
        errorResponseDto('3101', 'Malformed syntax - Invalid ID parameter: some{value}')
      )
    })
  })
})
