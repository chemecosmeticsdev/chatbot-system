import { Pool } from 'pg';
import { getConfig } from './config';

let pool: Pool | null = null;

export function getNeonPool(): Pool {
  if (!pool) {
    const config = getConfig();
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

// Alias for test compatibility
export const createDatabaseClient = getNeonPool;

// SQL execution function for tests
export async function executeSQLQuery(query: string, params: any[] = []) {
  const pool = getNeonPool();
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

export async function testNeonConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const pool = getNeonPool();
    const client = await pool.connect();

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    client.release();

    return {
      success: true,
      message: 'Neon PostgreSQL connection successful',
      data: {
        timestamp: result.rows[0].current_time,
        version: result.rows[0].postgres_version
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Neon connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function createTestTable(): Promise<{ success: boolean; message: string }> {
  try {
    const pool = getNeonPool();
    const client = await pool.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_tests (
        id SERIAL PRIMARY KEY,
        test_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert a test record
    await client.query(`
      INSERT INTO api_tests (test_name, status)
      VALUES ('database_connection', 'success')
      ON CONFLICT DO NOTHING
    `);

    client.release();

    return {
      success: true,
      message: 'Test table created and populated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}