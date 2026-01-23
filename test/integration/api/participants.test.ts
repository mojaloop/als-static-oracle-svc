import axios from 'axios'

const BASE_URL = 'http://localhost:3000/participants'

describe('participants API Tests -->', () => {
  describe('GET /participants/{Type}/{ID} endpoint', () => {
    test('should return error when ID is missing (e.g., /participants/MSISDN/)', async () => {
      expect.assertions(4)

      await axios.get(`${BASE_URL}/MSISDN/`).catch((err) => {
        expect(err.response.status).toBe(404)
        expect(err.response.data).toBeDefined()
        expect(err.response.data.errorInformation).toBeDefined()
        expect(err.response.data.errorInformation.errorCode).toBe('3002')
      })
    })

    test('should handle URL with trailing slash for existing party', async () => {
      // Test with a party ID that should exist based on routing rules in default.json
      const id = '123456789' // Matches exact rule R001 in config

      const response = await axios.get(`${BASE_URL}/MSISDN/${id}/`)
      expect(response.status).toBe(200)
      expect(response.data.partyList).toBeDefined()
      expect(response.data.partyList[0].fspId).toBe('dfsp2')
    })

    test('should return 200 for a valid GET request with exact match', async () => {
      const id = '123456789' // Matches exact rule R001 in config

      const { status, data } = await axios.get(`${BASE_URL}/MSISDN/${id}`)
      expect(status).toBe(200)
      expect(data.partyList).toBeDefined()
      expect(data.partyList[0].fspId).toBe('dfsp2')
    })

    test('should return 200 for a valid GET request with prefix match', async () => {
      const id = '919876543210' // Matches prefix rule R010 for India (91)

      const { status, data } = await axios.get(`${BASE_URL}/MSISDN/${id}`)
      expect(status).toBe(200)
      expect(data.partyList).toBeDefined()
      expect(data.partyList[0].fspId).toBe('dfspindia')
    })

    test('should return empty partyList for non-matching ID', async () => {
      const id = '999999999999' // Should not match any rules

      const { status, data } = await axios.get(`${BASE_URL}/MSISDN/${id}`)
      expect(status).toBe(200)
      expect(data.partyList).toEqual([])
    })
  })

  describe('Unsupported operations', () => {
    test('POST /participants should return error for unsupported operation', async () => {
      expect.assertions(2)

      await axios.post(BASE_URL, { requestId: '123', partyList: [] }).catch((err) => {
        expect(err.response.status).toBeGreaterThanOrEqual(400)
        expect(err.response.data.errorInformation).toBeDefined()
      })
    })

    test('POST /participants/{Type}/{ID} should return error for unsupported operation', async () => {
      expect.assertions(2)

      await axios.post(`${BASE_URL}/MSISDN/123456789`, { fspId: 'test' }).catch((err) => {
        expect(err.response.status).toBeGreaterThanOrEqual(400)
        expect(err.response.data.errorInformation).toBeDefined()
      })
    })

    test('PUT /participants/{Type}/{ID} should return error for unsupported operation', async () => {
      expect.assertions(2)

      await axios.put(`${BASE_URL}/MSISDN/123456789`, { fspId: 'test' }).catch((err) => {
        expect(err.response.status).toBeGreaterThanOrEqual(400)
        expect(err.response.data.errorInformation).toBeDefined()
      })
    })

    test('DELETE /participants/{Type}/{ID} should return error for unsupported operation', async () => {
      expect.assertions(2)

      await axios.delete(`${BASE_URL}/MSISDN/123456789`).catch((err) => {
        expect(err.response.status).toBeGreaterThanOrEqual(400)
        expect(err.response.data.errorInformation).toBeDefined()
      })
    })
  })
})
