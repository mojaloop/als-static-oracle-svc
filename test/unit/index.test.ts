/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the 2020-2025 Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation

 * Vijay Kumar Guthi <vijaya.guthi@infitx.com>
 * Lewis Daly <lewis@vesselstech.com>

 --------------
 ******/

import index from '~/index'
import Config from '~/shared/config'
import { Server, Request, ResponseToolkit } from '@hapi/hapi'
import { Context } from '~/server/plugins'

// Import handlers for mocking
import Handlers from '~/server/handlers'

// Mock data
import Headers from '../data/headers.json'
import { getParticipantsByTypeAndIDResponse } from '../data/data'

jest.mock('~/server/handlers', () => ({
  HealthGet: jest.fn((_context: Context, _req: Request, h: ResponseToolkit) =>
    Promise.resolve(h.response({ status: 'OK', uptime: 1.23 }).code(200))
  ),
  MetricsGet: jest.fn((_context: Context, _req: Request, h: ResponseToolkit) =>
    Promise.resolve(h.response({}).code(200))
  ),
  ParticipantsByTypeAndIDGet: jest.fn((_context: Context, _req: Request, h: ResponseToolkit) =>
    Promise.resolve(h.response({}).code(200))
  ),
  ParticipantsSubIdByTypeAndIDGet: jest.fn((_context: Context, _req: Request, h: ResponseToolkit) =>
    Promise.resolve(h.response({}).code(200))
  ),
  // Include the custom notFound handler that returns 404
  notFound: jest.fn((_context: Context, _req: Request, h: ResponseToolkit) =>
    Promise.resolve(
      h
        .response({
          errorInformation: {
            errorCode: '3002',
            errorDescription: 'Unknown URI'
          }
        })
        .code(404)
    )
  ),
  // Include other default handlers from central-services-shared
  validationFail: jest.fn(),
  methodNotAllowed: jest.fn()
}))

describe('index', (): void => {
  it('should have proper layout', (): void => {
    expect(typeof index.server).toBeDefined()
    expect(typeof index.server.run).toEqual('function')
  })
})

describe('api routes', (): void => {
  let server: Server

  beforeAll(async (): Promise<void> => {
    server = await index.server.run(Config)
  })

  afterAll(async (): Promise<void> => {
    await server.stop()
  })

  it('/health', async (): Promise<void> => {
    interface HealthResponse {
      status: string
      uptime: number
      startTime: string
      versionNumber: string
    }

    const request = {
      method: 'GET',
      url: '/health'
    }

    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    expect(response.result).toBeDefined()

    const result = response.result as HealthResponse
    expect(result.status).toEqual('OK')
    expect(result.uptime).toBeGreaterThan(1.0)
  })

  it('/metrics', async (): Promise<void> => {
    const request = {
      method: 'GET',
      url: '/metrics'
    }

    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    expect(response.result).toBeDefined()
  })

  describe('Endpoint: /participants/{Type}/{ID}', (): void => {
    it('should return 404 for GET /participants/MSISDN/ (missing ID)', async (): Promise<void> => {
      const request = {
        method: 'GET',
        url: '/participants/MSISDN/',
        headers: Headers
      }

      const response = await server.inject(request)
      expect(response.statusCode).toBe(404)
    })

    it('should return 200 for GET /participants/MSISDN/9998887777/', async (): Promise<void> => {
      const request = {
        method: 'GET',
        url: '/participants/MSISDN/9998887777/',
        headers: Headers
      }

      const response = await server.inject(request)
      expect(response.statusCode).toBe(200)
    })

    it('GET /participants/{Type}/{ID}', async (): Promise<void> => {
      const ParticipantsByTypeAndIDGet = jest.spyOn(Handlers, 'ParticipantsByTypeAndIDGet')
      ParticipantsByTypeAndIDGet.mockImplementationOnce((_context: Context, _req: Request, h: ResponseToolkit) =>
        Promise.resolve(h.response(getParticipantsByTypeAndIDResponse).code(200))
      )

      const request = {
        method: 'GET',
        url: '/participants/MSISDN/73f22dbf-e322-44df-b407-f5a80ace9e02',
        headers: Headers
      }

      const expectedArgs = expect.objectContaining({
        path: '/participants/MSISDN/73f22dbf-e322-44df-b407-f5a80ace9e02',
        method: 'get',
        params: {
          ID: '73f22dbf-e322-44df-b407-f5a80ace9e02',
          Type: 'MSISDN'
        }
      })

      const response = await server.inject(request)
      expect(ParticipantsByTypeAndIDGet).toHaveBeenCalledTimes(1)
      expect(ParticipantsByTypeAndIDGet).toHaveBeenCalledWith(expect.anything(), expectedArgs, expect.anything())
      expect(response.statusCode).toBe(200)
      expect(response.result).toStrictEqual(getParticipantsByTypeAndIDResponse)
    })
  })
})
