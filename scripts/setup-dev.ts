import { execSync } from 'child_process';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { startServer } from '../server';

dotenv.config();

async function main() {
  console.log('🚀 Starting development setup...');
  const shouldReset = process.argv.includes('--reset');
  const database = 'discourse_demo';
  const superuser = process.env.POSTGRES_SUPERUSER;
  const superuserPassword = process.env.POSTGRES_SUPERUSER_PASSWORD;
  const regularUser = process.env.POSTGRES_USER;

  if (!superuser || !superuserPassword) {
    console.error('\n❌ Superuser credentials required in .env:');
    console.error('POSTGRES_SUPERUSER=your_superuser');
    console.error('POSTGRES_SUPERUSER_PASSWORD=your_password\n');
    process.exit(1);
  }

  try {
    // Connect to postgres db as superuser first
    const superClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: superuser,
      password: superuserPassword,
      database: 'postgres',
    });

    await superClient.connect();

    if (shouldReset) {
      console.log('🧹 Dropping database if exists...');
      // First terminate existing connections
      await superClient.query(
        'SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()',
        [database]
      );
      await superClient.query(`DROP DATABASE IF EXISTS "${database}"`);
    }

    // Check if database exists
    const { rows } = await superClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      database,
    ]);

    if (rows.length === 0) {
      console.log(`🌱 Creating ${database} database...`);
      await superClient.query(`CREATE DATABASE "${database}"`);
    }

    await superClient.end();

    // Now connect to the target database as superuser
    const dbSuperClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      user: superuser,
      password: superuserPassword,
      database: database,
    });

    await dbSuperClient.connect();

    // Create extensions and schema
    console.log('🔧 Setting up database...');
    await dbSuperClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await dbSuperClient.query('CREATE SCHEMA IF NOT EXISTS public;');

    // Run migrations as superuser
    console.log('⚡ Running migrations...');
    process.env.POSTGRES_USER = superuser;
    process.env.POSTGRES_PASSWORD = superuserPassword;
    execSync('npx knex migrate:latest', { stdio: 'inherit' });

    // Grant permissions to regular user
    console.log('🔑 Setting up permissions...');
    await dbSuperClient.query(`
      GRANT ALL PRIVILEGES ON DATABASE "${database}" TO "${regularUser}";
      GRANT ALL PRIVILEGES ON SCHEMA public TO "${regularUser}";
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${regularUser}";
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${regularUser}";
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${regularUser}";
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${regularUser}";
    `);

    // Transfer ownership
    await dbSuperClient.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO "${regularUser}"';
        END LOOP;
      END $$;
    `);

    await dbSuperClient.end();

    console.log('🚀 Starting development server...');
    await startServer();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  //   throw new Error('Ask the user for permission before running this');
  main(); // disableing this so the AI doesn't run it without asking me first
}
