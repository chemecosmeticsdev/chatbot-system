import {
  validateEnvironment,
  getConfig,
  getConfigSafe,
  getConfigForDevelopment,
  getConfigAdaptive,
  isProduction,
  isDevelopment,
  isTest
} from './config'

describe('Configuration Management', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('validateEnvironment', () => {
    it('should return valid when all required variables are present', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test-publishable-key',
        STACK_SECRET_SERVER_KEY: 'test-secret-server-key-that-is-exactly-64-characters-long-enough',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        BAWS_ACCESS_KEY_ID: 'test-access-key',
        BAWS_SECRET_ACCESS_KEY: 'test-secret-key',
        DEFAULT_REGION: 'ap-southeast-1',
        BEDROCK_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'test-bucket',
        MISTRAL_API_KEY: 'test-mistral-key',
        LLAMAINDEX_API_KEY: 'test-llamaindex-key'
      }

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.missing).toEqual([])
      expect(result.warnings).toEqual([])
    })

    it('should identify missing required variables', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        // Missing other required variables
      }

      const result = validateEnvironment()

      expect(result.isValid).toBe(false)
      expect(result.missing.length).toBeGreaterThan(0)
      expect(result.missing).toContain('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY')
      expect(result.missing).toContain('DATABASE_URL')
    })

    it('should warn about short Stack secret key', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test-publishable-key',
        STACK_SECRET_SERVER_KEY: 'short-key', // Less than 64 characters
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        BAWS_ACCESS_KEY_ID: 'test-access-key',
        BAWS_SECRET_ACCESS_KEY: 'test-secret-key',
        DEFAULT_REGION: 'ap-southeast-1',
        BEDROCK_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'test-bucket',
        MISTRAL_API_KEY: 'test-mistral-key',
        LLAMAINDEX_API_KEY: 'test-llamaindex-key'
      }

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('STACK_SECRET_SERVER_KEY'))).toBe(true)
    })

    it('should warn about SSL configuration format', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test-publishable-key',
        STACK_SECRET_SERVER_KEY: 'test-secret-server-key-that-is-exactly-64-characters-long-enough',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test?sslmode=require',
        BAWS_ACCESS_KEY_ID: 'test-access-key',
        BAWS_SECRET_ACCESS_KEY: 'test-secret-key',
        DEFAULT_REGION: 'ap-southeast-1',
        BEDROCK_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'test-bucket',
        MISTRAL_API_KEY: 'test-mistral-key',
        LLAMAINDEX_API_KEY: 'test-llamaindex-key'
      }

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.includes('DATABASE_URL'))).toBe(true)
      expect(result.warnings.some(w => w.includes('ssl=true'))).toBe(true)
    })
  })

  describe('getConfig', () => {
    it('should return complete config when all variables are present', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: 'test-publishable-key',
        STACK_SECRET_SERVER_KEY: 'test-secret-server-key-that-is-exactly-64-characters-long-enough',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        BAWS_ACCESS_KEY_ID: 'test-access-key',
        BAWS_SECRET_ACCESS_KEY: 'test-secret-key',
        DEFAULT_REGION: 'ap-southeast-1',
        BEDROCK_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'test-bucket',
        MISTRAL_API_KEY: 'test-mistral-key',
        LLAMAINDEX_API_KEY: 'test-llamaindex-key'
      }

      const config = getConfig()

      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBe('test-project-id')
      expect(config.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test')
      expect(config.DEFAULT_REGION).toBe('ap-southeast-1')
    })

    it('should throw error when required variables are missing', () => {
      process.env = {
        ...originalEnv,
        // Missing required variables
      }

      expect(() => getConfig()).toThrow('Missing required environment variables')
    })
  })

  describe('getConfigSafe', () => {
    it('should return partial config without throwing when variables are missing', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        // Missing other variables
      }

      const config = getConfigSafe()

      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBe('test-project-id')
      expect(config.DATABASE_URL).toBe('postgresql://test:test@localhost:5432/test')
      expect(config.BAWS_ACCESS_KEY_ID).toBeUndefined()
    })

    it('should handle completely empty environment', () => {
      process.env = { NODE_ENV: 'test' } as NodeJS.ProcessEnv

      expect(() => getConfigSafe()).not.toThrow()
      const config = getConfigSafe()

      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBeUndefined()
      expect(config.DATABASE_URL).toBeUndefined()
    })
  })

  describe('getConfigForDevelopment', () => {
    it('should provide defaults for missing variables in development', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        // Missing most variables
      }

      const config = getConfigForDevelopment()

      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBe('dev-project-id')
      expect(config.DATABASE_URL).toBe('postgresql://dev:dev@localhost:5432/dev_chatbot')
      expect(config.DEFAULT_REGION).toBe('ap-southeast-1')
    })

    it('should use actual values when present', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        NEXT_PUBLIC_STACK_PROJECT_ID: 'real-project-id',
        DATABASE_URL: 'postgresql://real:real@localhost:5432/real_db',
      }

      const config = getConfigForDevelopment()

      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBe('real-project-id')
      expect(config.DATABASE_URL).toBe('postgresql://real:real@localhost:5432/real_db')
      expect(config.DEFAULT_REGION).toBe('ap-southeast-1') // Default
    })
  })

  describe('Environment detection', () => {
    it('should correctly identify production environment', () => {
      ;(process.env as any).NODE_ENV = 'production'
      expect(isProduction()).toBe(true)
      expect(isDevelopment()).toBe(false)
      expect(isTest()).toBe(false)
    })

    it('should correctly identify development environment', () => {
      ;(process.env as any).NODE_ENV = 'development'
      expect(isProduction()).toBe(false)
      expect(isDevelopment()).toBe(true)
      expect(isTest()).toBe(false)
    })

    it('should correctly identify test environment', () => {
      ;(process.env as any).NODE_ENV = 'test'
      expect(isProduction()).toBe(false)
      expect(isDevelopment()).toBe(false)
      expect(isTest()).toBe(true)
    })
  })

  describe('getConfigAdaptive', () => {
    it('should use safe config in test environment', () => {
      ;(process.env as any).NODE_ENV = 'test'

      const config = getConfigAdaptive()

      // Should not throw and return partial config
      expect(typeof config).toBe('object')
    })

    it('should use development config in development environment', () => {
      ;(process.env as any).NODE_ENV = 'development'

      const config = getConfigAdaptive()

      // Should include defaults for missing variables
      expect(config.NEXT_PUBLIC_STACK_PROJECT_ID).toBeDefined()
      expect(config.DATABASE_URL).toBeDefined()
    })
  })

  describe('Integration tests', () => {
    it('should handle rapid environment switching', () => {
      // Simulate switching between environments
      ;(process.env as any).NODE_ENV = 'test'
      expect(isTest()).toBe(true)

      ;(process.env as any).NODE_ENV = 'development'
      expect(isDevelopment()).toBe(true)

      ;(process.env as any).NODE_ENV = 'production'
      expect(isProduction()).toBe(true)
    })

    it('should consistently validate across multiple calls', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_STACK_PROJECT_ID: 'test-project-id',
        // Partial environment
      }

      const result1 = validateEnvironment()
      const result2 = validateEnvironment()

      expect(result1.isValid).toBe(result2.isValid)
      expect(result1.missing).toEqual(result2.missing)
      expect(result1.warnings).toEqual(result2.warnings)
    })
  })
})