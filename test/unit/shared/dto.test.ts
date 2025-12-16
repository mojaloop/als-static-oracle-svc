import { baseErrorResponseDto, addPartyErrorResponseDto, partyMapItemDto } from '~/shared/dto'

describe('shared/dto', (): void => {
  describe('baseErrorResponseDto', (): void => {
    it('should return error response with default values when no params provided', (): void => {
      const result = baseErrorResponseDto()
      expect(result.statusCode).toBe(500)
      expect(result.errorInformation.errorCode).toBe('2001')
      expect(result.errorInformation.errorDescription).toBe('Internal server error')
    })

    it('should return error response with custom values', (): void => {
      const result = baseErrorResponseDto(400, 'MALFORMED_SYNTAX')
      expect(result.statusCode).toBe(400)
      expect(result.errorInformation.errorCode).toBe('3101')
      expect(result.errorInformation.errorDescription).toBe('Malformed syntax')
    })
  })

  describe('addPartyErrorResponseDto', (): void => {
    it('should return add party error response', (): void => {
      const result = addPartyErrorResponseDto(400)
      expect(result.statusCode).toBe(400)
      expect(result.errorInformation.errorCode).toBe('3003')
      expect(result.errorInformation.errorDescription).toBe('Add Party information error')
    })
  })

  describe('partyMapItemDto', (): void => {
    it('should create party map item with subId from parameter', (): void => {
      const result = partyMapItemDto('123456', { fspId: 'dfsp1' }, 'subId123')
      expect(result).toEqual({
        id: '123456',
        fspId: 'dfsp1',
        subId: 'subId123'
      })
    })

    it('should create party map item with subId from body when parameter is not provided', (): void => {
      const result = partyMapItemDto('123456', { fspId: 'dfsp1', partySubIdOrType: 'subIdFromBody' })
      expect(result).toEqual({
        id: '123456',
        fspId: 'dfsp1',
        subId: 'subIdFromBody'
      })
    })

    it('should create party map item without subId when neither parameter nor body has it', (): void => {
      const result = partyMapItemDto('123456', { fspId: 'dfsp1' })
      expect(result).toEqual({
        id: '123456',
        fspId: 'dfsp1',
        subId: undefined
      })
    })
  })
})
