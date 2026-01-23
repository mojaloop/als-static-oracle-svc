import { RoutingBasedOracleDB } from '~/domain/RoutingBasedOracleDB'
import { RoutingEngine } from '~/domain/RoutingEngine'
import { logger } from '~/shared/logger'
import { NotFoundError } from '~/model/errors'

describe('RoutingBasedOracleDB Tests', (): void => {
  let oracleDB: RoutingBasedOracleDB
  let routingEngine: RoutingEngine

  beforeEach((): void => {
    routingEngine = new RoutingEngine(
      {
        rules: [
          {
            ruleId: 'TEST1',
            priority: 1,
            match: {
              type: 'MSISDN',
              id: { mode: 'EXACT', value: '123456' }
            },
            result: { dfspId: 'dfsp_exact' }
          },
          {
            ruleId: 'TEST2',
            priority: 10,
            match: {
              type: 'MSISDN',
              id: { mode: 'PREFIX', value: '91' }
            },
            result: { dfspId: 'dfsp_india' }
          },
          {
            ruleId: 'TEST3',
            priority: 20,
            match: {
              type: 'MSISDN',
              id: { mode: 'ANY' },
              subId: { mode: 'EXACT', value: 'WORK' }
            },
            result: { dfspId: 'dfsp_work' }
          },
          {
            ruleId: 'TEST4',
            priority: 30,
            match: {
              type: 'ACCOUNT_ID',
              id: { mode: 'ANY' },
              subId: { mode: 'EXACT', value: 'DFSP_CODE_1' }
            },
            result: { dfspId: 'dfsp_account_1' }
          },
          {
            ruleId: 'TEST5',
            priority: 40,
            match: {
              type: 'EMAIL',
              id: { mode: 'PREFIX', value: 'admin@' }
            },
            result: { dfspId: 'dfsp_admin' }
          }
        ]
      },
      logger
    )
    oracleDB = new RoutingBasedOracleDB(routingEngine, logger)
  })

  describe('retrieve', (): void => {
    it('should retrieve party from routing engine with exact match', async (): Promise<void> => {
      const result = await oracleDB.retrieve('MSISDN', '123456')

      expect(result).toEqual({
        id: '123456',
        fspId: 'dfsp_exact'
      })
    })

    it('should retrieve party from routing engine with prefix match', async (): Promise<void> => {
      const result = await oracleDB.retrieve('MSISDN', '9198765')

      expect(result).toEqual({
        id: '9198765',
        fspId: 'dfsp_india'
      })
    })

    it('should retrieve party with subId', async (): Promise<void> => {
      const result = await oracleDB.retrieve('MSISDN', '123456', 'sub1')

      expect(result).toEqual({
        id: '123456',
        subId: 'sub1',
        fspId: 'dfsp_exact'
      })
    })

    it('should throw NotFoundError when party not found', async (): Promise<void> => {
      await expect(oracleDB.retrieve('MSISDN', 'unknown')).rejects.toThrow(NotFoundError)
    })

    it('should retrieve MSISDN party with specific subId', async (): Promise<void> => {
      const result = await oracleDB.retrieve('MSISDN', '555123', 'WORK')

      expect(result).toEqual({
        id: '555123',
        subId: 'WORK',
        fspId: 'dfsp_work'
      })
    })

    it('should retrieve ACCOUNT_ID party with specific subId', async (): Promise<void> => {
      const result = await oracleDB.retrieve('ACCOUNT_ID', 'test123', 'DFSP_CODE_1')

      expect(result).toEqual({
        id: 'test123',
        subId: 'DFSP_CODE_1',
        fspId: 'dfsp_account_1'
      })
    })

    it('should retrieve EMAIL party with prefix match', async (): Promise<void> => {
      const result = await oracleDB.retrieve('EMAIL', 'admin@example.com')

      expect(result).toEqual({
        id: 'admin@example.com',
        fspId: 'dfsp_admin'
      })
    })

    it('should throw NotFoundError for unsupported party type', async (): Promise<void> => {
      await expect(oracleDB.retrieve('UNKNOWN_TYPE', '123')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError when subId does not match', async (): Promise<void> => {
      await expect(oracleDB.retrieve('MSISDN', '555123', 'INVALID_SUBID')).rejects.toThrow(NotFoundError)
    })
  })

  describe('isConnected', (): void => {
    it('should always return true', async (): Promise<void> => {
      const result = await oracleDB.isConnected()
      expect(result).toBe(true)
    })
  })

  describe('getStats', (): void => {
    it('should return routing engine stats', (): void => {
      const stats = oracleDB.getStats()
      expect(stats).toBeDefined()
      expect(stats.types).toBeGreaterThan(0)
      expect(stats.totalExactRules + stats.totalPrefixRules).toBeGreaterThan(0)
    })
  })
})
