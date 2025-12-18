import { ParticipantService } from '~/domain/ParticipantService'
import { IOracleDb } from '~/domain/types'
import { logger } from '~/shared/logger'
import { NotFoundError } from '~/model/errors'
import { createMockOracleDb } from '../__mocks__/util'

describe('ParticipantService Tests -->', () => {
  let service: ParticipantService
  let oracleDB: IOracleDb

  beforeEach(() => {
    oracleDB = createMockOracleDb()
    service = new ParticipantService({ logger, oracleDB })
  })

  describe('retrieveOneParty method Tests', () => {
    test('should retrieve a party when it exists', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: '123', fspId: 'dfsp1' })

      const result = await service.retrieveOneParty('MSISDN', '123')

      expect(result).toEqual({ fspId: 'dfsp1' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('MSISDN', '123', undefined)
    })

    test('should retrieve a party with subId when it exists', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: '123', subId: 'sub1', fspId: 'dfsp1' })

      const result = await service.retrieveOneParty('MSISDN', '123', 'sub1')

      expect(result).toEqual({ fspId: 'dfsp1', partySubIdOrType: 'sub1' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('MSISDN', '123', 'sub1')
    })

    test('should return null when party is not found', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new NotFoundError('oracleMSISDN', '999'))

      const result = await service.retrieveOneParty('MSISDN', '999')

      expect(result).toBeNull()
    })

    test('should throw error for other errors', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new Error('DB connection error'))

      await expect(service.retrieveOneParty('MSISDN', '123')).rejects.toThrow('DB connection error')
    })

    test('should retrieve ACCOUNT_ID party with subId', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: 'acc123', subId: 'DFSP_CODE_1', fspId: 'dfsp_account' })

      const result = await service.retrieveOneParty('ACCOUNT_ID', 'acc123', 'DFSP_CODE_1')

      expect(result).toEqual({ fspId: 'dfsp_account', partySubIdOrType: 'DFSP_CODE_1' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('ACCOUNT_ID', 'acc123', 'DFSP_CODE_1')
    })

    test('should retrieve EMAIL party without subId', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: 'admin@example.com', fspId: 'dfsp_email' })

      const result = await service.retrieveOneParty('EMAIL', 'admin@example.com')

      expect(result).toEqual({ fspId: 'dfsp_email' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('EMAIL', 'admin@example.com', undefined)
    })

    test('should return null when ACCOUNT_ID party with subId is not found', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new NotFoundError('oracleACCOUNT_ID', 'acc999'))

      const result = await service.retrieveOneParty('ACCOUNT_ID', 'acc999', 'UNKNOWN_SUBID')

      expect(result).toBeNull()
    })
  })
})
