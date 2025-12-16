import { ParticipantController } from '~/domain/ParticipantController'
import { createParticipantController } from '~/domain/createParticipantController'
import { IOracleDb } from '~/domain/types'
import { logger } from '~/shared/logger'
import { createMockOracleDb } from 'test/unit/__mocks__/util'
import { NotFoundError } from '~/model/errors'

describe('ParticipantController Tests -->', () => {
  let oracleDB: IOracleDb

  beforeEach(() => {
    oracleDB = createMockOracleDb()
  })

  it('should create ParticipantController instance', () => {
    const ctrl = createParticipantController({ oracleDB, logger })
    expect(ctrl).toBeInstanceOf(ParticipantController)
  })

  describe('handleGetPartyById Tests', () => {
    it('should return party list when party is found', async () => {
      oracleDB.retrieve = jest.fn().mockResolvedValue({ id: '123', fspId: 'dfsp1' })
      const ctrl = createParticipantController({ oracleDB, logger })
      const { result, statusCode } = await ctrl.handleGetPartyById('MSISDN', '123')
      expect(statusCode).toBe(200)
      if ('partyList' in result) {
        expect(result.partyList).toHaveLength(1)
        expect(result.partyList[0].fspId).toBe('dfsp1')
      } else {
        fail('Expected partyList in result')
      }
    })

    it('should return empty party list when party is not found', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new NotFoundError('oracleMSISDN', '999'))
      const ctrl = createParticipantController({ oracleDB, logger })
      const { result, statusCode } = await ctrl.handleGetPartyById('MSISDN', '999')
      expect(statusCode).toBe(200)
      if ('partyList' in result) {
        expect(result.partyList).toEqual([])
      } else {
        fail('Expected partyList in result')
      }
    })

    it('should return error response for unsupported party type', async () => {
      const ctrl = createParticipantController({ oracleDB, logger })
      const { result, statusCode } = await ctrl.handleGetPartyById('UNSUPPORTED', '123')
      expect(statusCode).toBe(400)
      if ('errorInformation' in result) {
        expect(result.errorInformation.errorCode).toBe('3101')
      } else {
        fail('Expected errorInformation in result')
      }
    })

    it('should return error response for generic errors', async () => {
      oracleDB.retrieve = jest.fn().mockRejectedValue(new Error('Database connection failed'))
      const ctrl = createParticipantController({ oracleDB, logger })
      const { result, statusCode } = await ctrl.handleGetPartyById('MSISDN', '123')
      expect(statusCode).toBe(500)
      if ('errorInformation' in result) {
        expect(result.errorInformation.errorCode).toBe('2001')
      } else {
        fail('Expected errorInformation in result')
      }
    })
  })
})
