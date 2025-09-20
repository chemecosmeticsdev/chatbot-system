#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes SQL migration files in order against Neon PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment configuration
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function runMigrations() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Create migrations tracking table
    console.log('📋 Setting up migration tracking...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Check which migrations have already been run
    const { rows: executedMigrations } = await client.query(
      'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
    );
    const executedNames = new Set(executedMigrations.map(row => row.migration_name));

    let executedCount = 0;
    let skippedCount = 0;

    for (const filename of migrationFiles) {
      const migrationName = filename.replace('.sql', '');

      if (executedNames.has(migrationName)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        skippedCount++;
        continue;
      }

      console.log(`🚀 Running migration: ${filename}`);

      try {
        // Read and execute migration file
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration in a transaction
        await client.query('BEGIN');
        await client.query(migrationSQL);

        // Record successful migration
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [migrationName]
        );

        await client.query('COMMIT');
        console.log(`✅ Successfully executed ${filename}`);
        executedCount++;

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to execute ${filename}:`, error.message);
        throw error;
      }
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`   - Executed: ${executedCount} migrations`);
    console.log(`   - Skipped: ${skippedCount} migrations (already done)`);
    console.log(`   - Total: ${migrationFiles.length} migrations`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };