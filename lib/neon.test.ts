import { createDatabaseClient, executeSQLQuery } from './neon'
import { Client } from 'pg'

// Mock the pg Client
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn(),
  })),
}))

// Mock the config
jest.mock('./config', () => ({
  getConfigSafe: jest.fn(() => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  })),
}))

describe('Neon Database Service', () => {
  let mockClient: jest.Mocked<Client>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = new Client() as jest.Mocked<Client>
    ;(Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient)
  })

  describe('createDatabaseClient', () => {
    it('should create a database client with correct configuration', () => {
      const client = createDatabaseClient()

      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test_db',
        ssl: { rejectUnauthorized: false },
      })
      expect(client).toBe(mockClient)
    })

    it('should handle missing DATABASE_URL gracefully', () => {
      const { getConfigSafe } = require('./config')
      getConfigSafe.mockReturnValue({})

      expect(() => createDatabaseClient()).not.toThrow()
      expect(Client).toHaveBeenCalledWith({
        connectionString: undefined,
        ssl: { rejectUnauthorized: false },
      })
    })
  })

  describe('executeSQLQuery', () => {
    it('should execute a simple query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery('SELECT * FROM test_table')

      expect(mockClient.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM test_table')
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResult)
    })

    it('should execute a parameterized query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery(
        'SELECT * FROM users WHERE id = $1',
        [1]
      )

      expect(mockClient.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      )
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResult)
    })

    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connection failed')
      mockClient.connect.mockRejectedValue(connectionError as any)

      await expect(
        executeSQLQuery('SELECT * FROM test_table')
      ).rejects.toThrow('Connection failed')

      expect(mockClient.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).not.toHaveBeenCalled()
      expect(mockClient.end).toHaveBeenCalledTimes(1)
    })

    it('should handle query execution errors', async () => {
      mockClient.connect.mockResolvedValue(undefined as any)
      const queryError = new Error('Query failed')
      mockClient.query.mockRejectedValue(queryError as any)

      await expect(
        executeSQLQuery('INVALID SQL QUERY')
      ).rejects.toThrow('Query failed')

      expect(mockClient.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith('INVALID SQL QUERY')
      expect(mockClient.end).toHaveBeenCalledTimes(1)
    })

    it('should ensure client is closed even if query fails', async () => {
      mockClient.connect.mockResolvedValue(undefined as any)
      mockClient.query.mockRejectedValue(new Error('Query failed') as any)

      try {
        await executeSQLQuery('SELECT * FROM test_table')
      } catch (error) {
        // Expected to fail
      }

      expect(mockClient.end).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple concurrent queries', async () => {
      const mockResult1 = { rows: [{ id: 1 }], rowCount: 1 }
      const mockResult2 = { rows: [{ id: 2 }], rowCount: 1 }

      // Set up different clients for concurrent queries
      const mockClient1 = { ...mockClient, query: jest.fn().mockResolvedValue(mockResult1) }
      const mockClient2 = { ...mockClient, query: jest.fn().mockResolvedValue(mockResult2) }

      ;(Client as jest.MockedClass<typeof Client>)
        .mockImplementationOnce(() => mockClient1 as any)
        .mockImplementationOnce(() => mockClient2 as any)

      const [result1, result2] = await Promise.all([
        executeSQLQuery('SELECT * FROM table1'),
        executeSQLQuery('SELECT * FROM table2'),
      ])

      expect(result1).toEqual(mockResult1)
      expect(result2).toEqual(mockResult2)
    })
  })

  describe('Database operations', () => {
    it('should handle SELECT operations', async () => {
      const mockResult = {
        rows: [
          { id: 1, name: 'User 1', email: 'user1@example.com' },
          { id: 2, name: 'User 2', email: 'user2@example.com' },
        ],
        rowCount: 2,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery('SELECT id, name, email FROM users')

      expect(result.rows).toHaveLength(2)
      expect(result.rowCount).toBe(2)
    })

    it('should handle INSERT operations', async () => {
      const mockResult = {
        rows: [{ id: 123 }],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
        ['Test User', 'test@example.com']
      )

      expect(result.rows[0].id).toBe(123)
      expect(result.rowCount).toBe(1)
    })

    it('should handle UPDATE operations', async () => {
      const mockResult = {
        rows: [],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery(
        'UPDATE users SET name = $1 WHERE id = $2',
        ['Updated Name', 1]
      )

      expect(result.rowCount).toBe(1)
    })

    it('should handle DELETE operations', async () => {
      const mockResult = {
        rows: [],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery(
        'DELETE FROM users WHERE id = $1',
        [1]
      )

      expect(result.rowCount).toBe(1)
    })
  })

  describe('Vector operations (if supported)', () => {
    it('should handle vector similarity search', async () => {
      const mockResult = {
        rows: [
          {
            id: 'doc-1',
            content: 'Sample document content',
            similarity: 0.95,
            metadata: { title: 'Sample Document' },
          },
        ],
        rowCount: 1,
      }
      mockClient.query.mockResolvedValue(mockResult as any)

      const result = await executeSQLQuery(`
        SELECT
          id,
          content,
          1 - (embedding <=> $1) as similarity,
          metadata
        FROM document_chunks
        WHERE 1 - (embedding <=> $1) > $2
        ORDER BY similarity DESC
        LIMIT $3
      `, ['[0.1, 0.2, 0.3]', 0.8, 10])

      expect(result.rows[0].similarity).toBe(0.95)
      expect(result.rows[0].content).toBe('Sample document content')
    })

    it('should handle vector index creation', async () => {
      const mockResult = { rows: [], rowCount: 0 }
      mockClient.query.mockResolvedValue(mockResult as any)

      await executeSQLQuery(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_embedding
        ON document_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `)

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX')
      )
    })
  })

  describe('Performance and optimization', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResult = {
        rows: Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `User ${i}` })),
        rowCount: 10000,
      }
      mockClient.query.mockResolvedValue(largeResult)

      const startTime = performance.now()
      const result = await executeSQLQuery('SELECT * FROM users')
      const endTime = performance.now()

      expect(result.rows).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(1000) // Should process in under 1 second
    })

    it('should handle connection timeouts gracefully', async () => {
      const timeoutError = new Error('Connection timeout')
      timeoutError.name = 'TimeoutError'
      mockClient.connect.mockRejectedValue(timeoutError as any)

      await expect(
        executeSQLQuery('SELECT * FROM users')
      ).rejects.toThrow('Connection timeout')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty query results', async () => {
      const emptyResult = { rows: [], rowCount: 0 }
      mockClient.query.mockResolvedValue(emptyResult)

      const result = await executeSQLQuery('SELECT * FROM users WHERE id = $1', [999])

      expect(result.rows).toHaveLength(0)
      expect(result.rowCount).toBe(0)
    })

    it('should handle SQL injection attempts safely', async () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const mockResult = { rows: [], rowCount: 0 }
      mockClient.query.mockResolvedValue(mockResult as any)

      // Should use parameterized query
      await executeSQLQuery(
        'SELECT * FROM users WHERE name = $1',
        [maliciousInput]
      )

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = $1',
        [maliciousInput]
      )
    })

    it('should handle null and undefined parameters', async () => {
      const mockResult = { rows: [], rowCount: 0 }
      mockClient.query.mockResolvedValue(mockResult as any)

      await executeSQLQuery(
        'SELECT * FROM users WHERE name = $1 AND email = $2',
        [null, undefined]
      )

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = $1 AND email = $2',
        [null, undefined]
      )
    })
  })
})