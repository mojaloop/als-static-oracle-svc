process.env.ALS_MSISDN_ORACLE_PORT = '23000'

import { Server } from '@hapi/hapi'
import createServer from '~/server/create'
import config from '~/shared/config'
import { NotFoundError, RetriableDbError } from '~/model/errors'
import { ParticipantServiceDeps } from '~/domain/types'
import { logger } from '~/shared/logger'
import { createMockOracleDb } from 'test/unit/__mocks__/util'

// const makeUrl = (ID: string, Type: string = 'MSISDN') => `/participants/${Type}/${ID}`

describe('create server Tests -->', () => {
  let deps: ParticipantServiceDeps

  beforeEach(() => {
    deps = {
      oracleDB: createMockOracleDb(),
      logger
    }
  })

  test('should create server', async () => {
    const server = await createServer(config, deps)
    expect(server).toBeDefined()
  })

  describe('e2e API Tests -->', () => {
    let server: Server

    const injectHttpRequest = async <T>(
      url = '/',
      method = 'GET',
      payload: object | undefined = undefined,
      headers = {}
    ) => server.inject<T>({ url, method, headers, payload })

    beforeEach(async () => {
      server = await createServer(config, deps)
    })

    afterEach(async () => {
      await server.stop()
    })

    test('should handle healthCheck request', async () => {
      const { statusCode, payload } = await injectHttpRequest('/health')
      expect(statusCode).toBe(200)
      expect(JSON.parse(payload).status).toBe('OK')
    })

    describe('GET /participants/... APIs Tests -->', () => {
      test('should return 400 for unsupported Type', async () => {
        const { statusCode, payload } = await injectHttpRequest('/participants/UNSUPPORTED_TYPE/123')
        expect(statusCode).toBe(400)
        expect(JSON.parse(payload).errorInformation).toBeDefined()
      })

      test('should return 200 for supported EMAIL type', async () => {
        deps.oracleDB.retrieve = jest.fn().mockResolvedValue({ id: 'admin@example.com', fspId: 'dfsp-admin' })
        const { statusCode, payload } = await injectHttpRequest('/participants/EMAIL/admin@example.com')
        expect(statusCode).toBe(200)
        expect(JSON.parse(payload).partyList).toHaveLength(1)
      })

      test('should return 200 for supported IBAN type', async () => {
        deps.oracleDB.retrieve = jest.fn().mockResolvedValue({ id: 'DE89370400440532013000', fspId: 'dfsp-germany' })
        const { statusCode, payload } = await injectHttpRequest('/participants/IBAN/DE89370400440532013000')
        expect(statusCode).toBe(200)
        expect(JSON.parse(payload).partyList).toHaveLength(1)
      })

      test('should return 200 for supported ACCOUNT_ID type', async () => {
        deps.oracleDB.retrieve = jest.fn().mockResolvedValue({ id: 'COM12345', fspId: 'dfsp-commercial' })
        const { statusCode, payload } = await injectHttpRequest('/participants/ACCOUNT_ID/COM12345')
        expect(statusCode).toBe(200)
        expect(JSON.parse(payload).partyList).toHaveLength(1)
      })

      test('should return 200 and empty partiList for non-existent MSISDN', async () => {
        deps.oracleDB.retrieve = jest.fn().mockRejectedValue(new NotFoundError('oracleMSISDN', 'x123'))
        const { statusCode, payload } = await injectHttpRequest('/participants/MSISDN/123')
        expect(statusCode).toBe(200)
        expect(JSON.parse(payload).partyList).toEqual([])
      })

      test('should return 503 in case of retriable DB error', async () => {
        const dbErrMessage = 'dbErrMessage'
        deps.oracleDB.retrieve = jest.fn().mockRejectedValue(new RetriableDbError(dbErrMessage))
        // todo: think how to emulate raw PROTOCOL_CONNECTION_LOST error
        const { statusCode, payload } = await injectHttpRequest('/participants/MSISDN/123')
        expect(statusCode).toBe(503)
        expect(payload).toContain(dbErrMessage)
      })
    })
  })
})
