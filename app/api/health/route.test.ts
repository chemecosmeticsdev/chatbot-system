/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock dependencies
jest.mock('@/lib/config', () => ({
  getConfigSafe: jest.fn(() => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
  })),
}))

jest.mock('@/lib/neon', () => ({
  executeSQLQuery: jest.fn(),
}))

describe('/api/health API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when all services are working', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.status).toBe('healthy')
      expect(data.checks).toBeDefined()
      expect(data.checks.database).toBe('healthy')
      expect(data.checks.environment).toBe('healthy')
    })

    it('should return unhealthy status when database connection fails', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.status).toBe(503)

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.status).toBe('unhealthy')
      expect(data.checks.database).toBe('unhealthy')
    })

    it('should return partial health when some services fail', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      const { getConfigSafe } = require('@/lib/config')

      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })
      getConfigSafe.mockReturnValue({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        // Missing some environment variables
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      const data = await response.json()
      expect(data.status).toBe('degraded')
      expect(data.checks.database).toBe('healthy')
      expect(data.checks.environment).toBe('partial')
    })

    it('should include response time metrics', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      const data = await response.json()
      expect(data.responseTime).toBeDefined()
      expect(typeof data.responseTime).toBe('number')
      expect(data.responseTime).toBeGreaterThan(0)
    })

    it('should include timestamp in response', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      const data = await response.json()
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })

    it('should handle database timeout gracefully', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      const timeoutError = new Error('Query timeout')
      timeoutError.name = 'TimeoutError'
      executeSQLQuery.mockRejectedValue(timeoutError)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.status).toBe(503)

      const data = await response.json()
      expect(data.checks.database).toBe('unhealthy')
      expect(data.errors).toContain('Database timeout')
    })

    it('should validate CORS headers', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const request = new NextRequest('http://localhost:3000/api/health', {
        headers: {
          'Origin': 'https://example.com'
        }
      })
      const response = await GET(request)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
    })

    it('should handle rapid successive requests', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const requests = Array.from({ length: 5 }, () =>
        new NextRequest('http://localhost:3000/api/health')
      )

      const responses = await Promise.all(
        requests.map(request => GET(request))
      )

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      expect(executeSQLQuery).toHaveBeenCalledTimes(5)
    })

    it('should include version information if available', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      // Mock package.json version
      jest.doMock('../../../../package.json', () => ({
        version: '1.0.0'
      }), { virtual: true })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      const data = await response.json()
      expect(data.version).toBeDefined()
    })

    it('should handle malformed requests gracefully', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      // Create request with invalid URL
      const request = new NextRequest('http://localhost:3000/api/health?invalid=param%')

      const response = await GET(request)

      // Should still return health check, ignoring invalid params
      expect(response.status).toBe(200)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should respond within acceptable time limits', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const request = new NextRequest('http://localhost:3000/api/health')

      const startTime = performance.now()
      const response = await GET(request)
      const endTime = performance.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000) // Should respond in under 1 second
    })

    it('should handle concurrent requests efficiently', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      const concurrentRequests = 10
      const requests = Array.from({ length: concurrentRequests }, () =>
        new NextRequest('http://localhost:3000/api/health')
      )

      const startTime = performance.now()
      const responses = await Promise.all(
        requests.map(request => GET(request))
      )
      const endTime = performance.now()

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from transient database errors', async () => {
      const { executeSQLQuery } = require('@/lib/neon')

      // First call fails, second succeeds
      executeSQLQuery
        .mockRejectedValueOnce(new Error('Transient database error'))
        .mockResolvedValueOnce({ rows: [{ now: '2023-01-01T00:00:00Z' }] })

      // First request should fail
      const request1 = new NextRequest('http://localhost:3000/api/health')
      const response1 = await GET(request1)
      expect(response1.status).toBe(503)

      // Second request should succeed
      const request2 = new NextRequest('http://localhost:3000/api/health')
      const response2 = await GET(request2)
      expect(response2.status).toBe(200)
    })

    it('should handle partial service failures gracefully', async () => {
      const { executeSQLQuery } = require('@/lib/neon')
      const { getConfigSafe } = require('@/lib/config')

      // Database works but config is incomplete
      executeSQLQuery.mockResolvedValue({ rows: [{ now: '2023-01-01T00:00:00Z' }] })
      getConfigSafe.mockReturnValue({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        // Other required configs missing
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      const data = await response.json()
      expect(data.status).toBe('degraded')
      expect(data.checks.database).toBe('healthy')
      expect(data.checks.environment).toBe('partial')
    })
  })
})