import { createDatabaseClient, executeSQLQuery } from './neon'
import { Client } from 'pg'

// Mock the pg Client
const mockConnect = jest.fn();
const mockEnd = jest.fn();
const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockEnd,
    query: mockQuery,
  })),
}))

// Mock the config
jest.mock('./config', () => ({
  getConfigSafe: jest.fn(() => ({
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  })),
}))

describe('Neon Database Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDatabaseClient', () => {
    it('should create a database client with correct configuration', () => {
      const client = createDatabaseClient()

      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test_db',
        ssl: { rejectUnauthorized: false },
      })
      expect(client).toBeDefined()
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
      mockQuery.mockResolvedValue(mockResult)

      const result = await executeSQLQuery('SELECT * FROM test_table')

      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test_table')
      expect(mockEnd).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResult)
    })

    it('should execute a parameterized query successfully', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1,
      }
      mockQuery.mockResolvedValue(mockResult)

      const result = await executeSQLQuery(
        'SELECT * FROM users WHERE id = $1',
        [1]
      )

      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      )
      expect(mockEnd).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResult)
    })

    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connection failed')
      mockConnect.mockRejectedValue(connectionError)

      await expect(
        executeSQLQuery('SELECT * FROM test_table')
      ).rejects.toThrow('Connection failed')

      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(mockQuery).not.toHaveBeenCalled()
      expect(mockEnd).toHaveBeenCalledTimes(1)
    })

    it('should handle query execution errors', async () => {
      mockConnect.mockResolvedValue(undefined)
      const queryError = new Error('Query failed')
      mockQuery.mockRejectedValue(queryError)

      await expect(
        executeSQLQuery('INVALID SQL QUERY')
      ).rejects.toThrow('Query failed')

      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(mockQuery).toHaveBeenCalledWith('INVALID SQL QUERY')
      expect(mockEnd).toHaveBeenCalledTimes(1)
    })

    it('should ensure client is closed even if query fails', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockQuery.mockRejectedValue(new Error('Query failed'))

      try {
        await executeSQLQuery('SELECT * FROM test_table')
      } catch (error) {
        // Expected to fail
      }

      expect(mockEnd).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple concurrent queries', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 }
      mockQuery.mockResolvedValue(mockResult)

      const [result1, result2] = await Promise.all([
        executeSQLQuery('SELECT * FROM table1'),
        executeSQLQuery('SELECT * FROM table2'),
      ])

      expect(result1).toEqual(mockResult)
      expect(result2).toEqual(mockResult)
      expect(mockQuery).toHaveBeenCalledTimes(2)
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
      mockQuery.mockResolvedValue(mockResult)

      const result = await executeSQLQuery('SELECT id, name, email FROM users')

      expect(result.rows).toHaveLength(2)
      expect(result.rowCount).toBe(2)
    })

    it('should handle INSERT operations', async () => {
      const mockResult = {
        rows: [{ id: 123 }],
        rowCount: 1,
      }
      mockQuery.mockResolvedValue(mockResult)

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
      mockQuery.mockResolvedValue(mockResult)

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
      mockQuery.mockResolvedValue(mockResult)

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
      mockQuery.mockResolvedValue(mockResult)

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
      mockQuery.mockResolvedValue(mockResult)

      await executeSQLQuery(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_embedding
        ON document_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `)

      expect(mockQuery).toHaveBeenCalledWith(
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
      mockQuery.mockResolvedValue(largeResult)

      const startTime = performance.now()
      const result = await executeSQLQuery('SELECT * FROM users')
      const endTime = performance.now()

      expect(result.rows).toHaveLength(10000)
      expect(endTime - startTime).toBeLessThan(1000) // Should process in under 1 second
    })

    it('should handle connection timeouts gracefully', async () => {
      const timeoutError = new Error('Connection timeout')
      timeoutError.name = 'TimeoutError'
      mockConnect.mockRejectedValue(timeoutError)

      await expect(
        executeSQLQuery('SELECT * FROM users')
      ).rejects.toThrow('Connection timeout')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty query results', async () => {
      const emptyResult = { rows: [], rowCount: 0 }
      mockQuery.mockResolvedValue(emptyResult)

      const result = await executeSQLQuery('SELECT * FROM users WHERE id = $1', [999])

      expect(result.rows).toHaveLength(0)
      expect(result.rowCount).toBe(0)
    })

    it('should handle SQL injection attempts safely', async () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const mockResult = { rows: [], rowCount: 0 }
      mockQuery.mockResolvedValue(mockResult)

      // Should use parameterized query
      await executeSQLQuery(
        'SELECT * FROM users WHERE name = $1',
        [maliciousInput]
      )

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = $1',
        [maliciousInput]
      )
    })

    it('should handle null and undefined parameters', async () => {
      const mockResult = { rows: [], rowCount: 0 }
      mockQuery.mockResolvedValue(mockResult)

      await executeSQLQuery(
        'SELECT * FROM users WHERE name = $1 AND email = $2',
        [null, undefined]
      )

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = $1 AND email = $2',
        [null, undefined]
      )
    })
  })
})