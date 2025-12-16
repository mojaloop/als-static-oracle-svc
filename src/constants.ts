// Supported Party ID Types as per Mojaloop API specification
export const SUPPORTED_PARTY_ID_TYPES = [
  'MSISDN',
  'EMAIL',
  'PERSONAL_ID',
  'BUSINESS',
  'DEVICE',
  'ACCOUNT_ID',
  'IBAN',
  'ALIAS'
] as const

export type PartyIdType = (typeof SUPPORTED_PARTY_ID_TYPES)[number]

export const ERROR_MESSAGES = {
  noPartyFspId: 'Each partyItem should have fspId',
  unsupportedPartyIdType: `Unsupported ID type. Supported: ${SUPPORTED_PARTY_ID_TYPES.join(', ')}`
} as const

export const MAX_ERROR_DESCRIPTION_LENGTH = 128 // according to OpenAPI schema of ErrorInformation
