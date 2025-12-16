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
          }
        ]
      },
      logger
    )
    oracleDB = new RoutingBasedOracleDB(routingEngine, logger)
  })

  describe('retrieve', (): void => {
    it('should retrieve party from routing engine with exact match', async (): Promise<void> => {
      const result = await oracleDB.retrieve('123456')

      expect(result).toEqual({
        id: '123456',
        fspId: 'dfsp_exact'
      })
    })

    it('should retrieve party from routing engine with prefix match', async (): Promise<void> => {
      const result = await oracleDB.retrieve('9198765')

      expect(result).toEqual({
        id: '9198765',
        fspId: 'dfsp_india'
      })
    })

    it('should retrieve party with subId', async (): Promise<void> => {
      const result = await oracleDB.retrieve('123456', 'sub1')

      expect(result).toEqual({
        id: '123456',
        subId: 'sub1',
        fspId: 'dfsp_exact'
      })
    })

    it('should throw NotFoundError when party not found', async (): Promise<void> => {
      await expect(oracleDB.retrieve('unknown')).rejects.toThrow(NotFoundError)
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
