import { Request, ResponseToolkit } from '@hapi/hapi'
import Metrics from '@mojaloop/central-services-metrics'
import MetricsHandler from '~/server/handlers/metrics'

jest.mock('@mojaloop/central-services-metrics')

describe('server/handlers/metrics', (): void => {
  let mockRequest: Request
  let mockResponseToolkit: any

  beforeEach(() => {
    mockRequest = {} as Request
    const mockResponse = {
      code: jest.fn().mockReturnThis()
    }
    mockResponseToolkit = {
      response: jest.fn().mockReturnValue(mockResponse)
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /metrics', (): void => {
    it('should return prometheus metrics with 200 status code', async (): Promise<void> => {
      const mockMetrics = 'mock_prometheus_metrics_data'
      ;(Metrics.getMetricsForPrometheus as jest.Mock).mockResolvedValue(mockMetrics)

      await MetricsHandler.get({} as any, mockRequest, mockResponseToolkit as ResponseToolkit)

      expect(Metrics.getMetricsForPrometheus).toHaveBeenCalledTimes(1)
      expect(mockResponseToolkit.response).toHaveBeenCalledWith(mockMetrics)
      expect(mockResponseToolkit.response().code).toHaveBeenCalledWith(200)
    })

    it('should handle empty metrics', async (): Promise<void> => {
      const emptyMetrics = ''
      ;(Metrics.getMetricsForPrometheus as jest.Mock).mockResolvedValue(emptyMetrics)

      await MetricsHandler.get({} as any, mockRequest, mockResponseToolkit as ResponseToolkit)

      expect(Metrics.getMetricsForPrometheus).toHaveBeenCalledTimes(1)
      expect(mockResponseToolkit.response).toHaveBeenCalledWith(emptyMetrics)
      expect(mockResponseToolkit.response().code).toHaveBeenCalledWith(200)
    })
  })
})
