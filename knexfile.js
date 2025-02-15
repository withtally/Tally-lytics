/* eslint-env node */
/* global process */
import dotenv from 'dotenv';
dotenv.config();

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

export default {
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
  production: {
    // debug: true,
    ...commonConfig,
    connection: {
      connectionString: process.env.SUPABASE_CONNECTION_STRING,
      // ssl: { rejectUnauthorized: false },
    },
  },
};
