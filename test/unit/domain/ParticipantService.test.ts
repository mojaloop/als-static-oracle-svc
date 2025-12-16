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

      const result = await service.retrieveOneParty('123')

      expect(result).toEqual({ fspId: 'dfsp1' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('123', undefined)
    })

    test('should retrieve a party with subId when it exists', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: '123', subId: 'sub1', fspId: 'dfsp1' })

      const result = await service.retrieveOneParty('123', 'sub1')

      expect(result).toEqual({ fspId: 'dfsp1', partySubIdOrType: 'sub1' })
      expect(oracleDB.retrieve).toHaveBeenCalledWith('123', 'sub1')
    })

    test('should return null when party is not found', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new NotFoundError('oracleMSISDN', '999'))

      const result = await service.retrieveOneParty('999')

      expect(result).toBeNull()
    })

    test('should throw error for other errors', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new Error('DB connection error'))

      await expect(service.retrieveOneParty('123')).rejects.toThrow('DB connection error')
    })
  })
})
