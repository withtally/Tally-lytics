/* eslint-env node */
/* global process, console */
import dotenv from 'dotenv';
dotenv.config();

// Add detailed logging
console.log('=== KNEXFILE CONFIGURATION DEBUGGING ===');
console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());

// Check if .env.production is loaded when in production mode
if (process.env.NODE_ENV === 'production') {
  console.log('Loading production environment variables...');
  try {
    const result = dotenv.config({ path: '.env.production' });
    if (result.error) {
      console.error('Error loading .env.production:', result.error.message);
    } else {
      console.log('.env.production loaded successfully');
    }
  } catch (error) {
    console.error('Exception loading .env.production:', error);
  }
}

// Log connection details (safely)
const connectionString = process.env.SUPABASE_CONNECTION_STRING;
console.log('SUPABASE_CONNECTION_STRING present:', !!connectionString);

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
    debug: true, // Enable debug for production to see queries
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

// Log the final configuration (without sensitive data)
const environment = process.env.NODE_ENV || 'development';
console.log('Using environment:', environment);
console.log(
  'Connection config type:',
  typeof config[environment].connection === 'string' ? 'Connection String' : 'Connection Object'
);
if (typeof config[environment].connection === 'object') {
  const connObj = { ...config[environment].connection };
  if (connObj.password) connObj.password = '***REDACTED***';
  if (connObj.connectionString) connObj.connectionString = '***REDACTED***';
  console.log('Connection config:', connObj);
}
console.log('=== END DEBUGGING ===');

export default config;
