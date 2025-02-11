import { Client } from 'pg';
import { registerType } from 'pgvector/pg';

const environment = process.env.NODE_ENV || 'development';

let clientConfig;

if (environment === 'development') {
  // Use local database configuration
  clientConfig = {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
  };
} else {
  // Use Supabase configuration for production
  clientConfig = {
    connectionString: process.env.SUPABASE_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

const pgVectorClient = new Client(clientConfig);

// Register the vector type
registerType(pgVectorClient);

// Function to initialize the client
async function initializePgVectorClient() {
  await pgVectorClient.connect();
}

export { pgVectorClient, initializePgVectorClient };
