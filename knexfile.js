/* eslint-env node */
/* global process, console */
import dotenv from 'dotenv';
dotenv.config();

// Support both Railway's DATABASE_URL and custom SUPABASE_CONNECTION_STRING
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING;

const commonConfig = {
  client: 'pg',
  migrations: {
    directory: './db/migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

const config = {
  development: {
    // debug: true,
    ...commonConfig,
    connection: {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: false,
    },
  },
  test: {
    ...commonConfig,
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'dao_helper_test',
      user: process.env.POSTGRES_USER || 'test_user',
      password: process.env.POSTGRES_PASSWORD || 'test_password',
      ssl: false,
    },
  },
  production: {
    ...commonConfig,
    connection: connectionString
      ? {
          connectionString,
          ssl: { rejectUnauthorized: false }, // Enable SSL for Supabase
        }
      : {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT || 5432,
          database: process.env.POSTGRES_DB || 'postgres',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD,
          ssl: { rejectUnauthorized: false },
        },
  },
};

export default config;
