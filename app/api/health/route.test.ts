/**
 * @jest-environment node
 */
import { GET } from './route'

// Mock dependencies
jest.mock('@/lib/config', () => ({
  validateEnvironment: jest.fn(() => ({
    isValid: true,
    missing: []
  })),
}))

describe('/api/health API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when all services are working', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.environment).toBeDefined()
      expect(data.timestamp).toBeDefined()
    })

    it('should return healthy status even with missing environment variables', async () => {
      // Mock some missing environment variables
      const originalEnv = process.env
      process.env = { ...originalEnv }
      delete process.env.MISTRAL_API_KEY
      delete process.env.LLAMAINDEX_API_KEY

      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.environment.summary.missing).toBeGreaterThan(0)
      expect(data.message).toContain('environment variables missing')

      // Restore environment
      process.env = originalEnv
    })

    it('should return validation status from config module', async () => {
      const { validateEnvironment } = require('@/lib/config')
      validateEnvironment.mockReturnValue({
        isValid: false,
        missing: ['DATABASE_URL', 'STACK_SECRET_SERVER_KEY']
      })

      const response = await GET()

      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.environment.validation.isValid).toBe(false)
      expect(data.environment.validation.missingFromValidation).toEqual(['DATABASE_URL', 'STACK_SECRET_SERVER_KEY'])
    })

    it('should include timestamp in response', async () => {
      const response = await GET()

      const data = await response.json()
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })

    it('should include environment summary', async () => {
      const response = await GET()

      const data = await response.json()
      expect(data.environment.summary).toBeDefined()
      expect(data.environment.summary.total).toBeGreaterThan(0)
      expect(data.environment.summary.present).toBeGreaterThanOrEqual(0)
      expect(data.environment.summary.missing).toBeGreaterThanOrEqual(0)
    })

    it('should handle config validation errors gracefully', async () => {
      const { validateEnvironment } = require('@/lib/config')
      validateEnvironment.mockImplementation(() => {
        throw new Error('Config validation error')
      })

      const response = await GET()

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.status).toBe('error')
      expect(data.error).toContain('Config validation error')
    })

    it('should include node environment in response', async () => {
      const originalNodeEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        configurable: true
      })

      const response = await GET()

      const data = await response.json()
      expect(data.environment.nodeEnv).toBe('test')

      // Restore original NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        configurable: true
      })
    })

    it('should handle rapid successive requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => GET())
      )

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Each response should have the same structure
      for (const response of responses) {
        const data = await response.json()
        expect(data.status).toBe('healthy')
        expect(data.environment).toBeDefined()
      }
    })

    it('should include environment variables status', async () => {
      const response = await GET()

      const data = await response.json()
      expect(data.environment.variables).toBeDefined()
      expect(typeof data.environment.variables).toBe('object')

      // Should check for required variables
      expect(data.environment.variables.NEXT_PUBLIC_STACK_PROJECT_ID).toBeDefined()
      expect(data.environment.variables.DATABASE_URL).toBeDefined()
    })

    it('should provide helpful message about missing variables', async () => {
      // Store original values
      const originalMistral = process.env.MISTRAL_API_KEY
      const originalLlama = process.env.LLAMAINDEX_API_KEY
      const originalBaws = process.env.BAWS_ACCESS_KEY_ID

      // Temporarily remove variables
      delete process.env.MISTRAL_API_KEY
      delete process.env.LLAMAINDEX_API_KEY
      delete process.env.BAWS_ACCESS_KEY_ID

      const response = await GET()

      const data = await response.json()
      expect(data.message).toBeDefined()
      expect(data.message).toContain('environment variables missing')

      // Restore original values
      if (originalMistral) process.env.MISTRAL_API_KEY = originalMistral
      if (originalLlama) process.env.LLAMAINDEX_API_KEY = originalLlama
      if (originalBaws) process.env.BAWS_ACCESS_KEY_ID = originalBaws
    })
  })

  describe('Performance and Load Testing', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = performance.now()
      const response = await GET()
      const endTime = performance.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000) // Should respond in under 1 second
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10

      const startTime = performance.now()
      const responses = await Promise.all(
        Array.from({ length: concurrentRequests }, () => GET())
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
    it('should handle environment validation errors gracefully', async () => {
      const { validateEnvironment } = require('@/lib/config')

      // First call fails, second succeeds
      validateEnvironment
        .mockImplementationOnce(() => {
          throw new Error('Transient validation error')
        })
        .mockReturnValueOnce({ isValid: true, missing: [] })

      // First request should return error
      const response1 = await GET()
      expect(response1.status).toBe(500)

      // Second request should succeed
      const response2 = await GET()
      expect(response2.status).toBe(200)
    })

    it('should continue working even with invalid environment variables', async () => {
      const { validateEnvironment } = require('@/lib/config')

      // Mock validation returning false but not throwing
      validateEnvironment.mockReturnValue({
        isValid: false,
        missing: ['DATABASE_URL', 'STACK_SECRET_SERVER_KEY']
      })

      const response = await GET()

      const data = await response.json()
      expect(data.status).toBe('healthy') // Still returns healthy
      expect(data.environment.validation.isValid).toBe(false)
      expect(data.environment.validation.missingFromValidation).toEqual(['DATABASE_URL', 'STACK_SECRET_SERVER_KEY'])
    })
  })
})