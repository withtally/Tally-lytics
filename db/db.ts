import knex from 'knex';
import knexConfig from '../knexfile.js';
import type { KnexConfig, Environment } from '../types/knex.js';

// Get the environment and configuration
const environment = (process.env.NODE_ENV || 'development') as Environment;
const typedKnexConfig = knexConfig as KnexConfig;

// Validate that the environment exists in the config
if (!typedKnexConfig[environment]) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const config = typedKnexConfig[environment];

// Create the database connection
const db = knex(config);

// Export the database connection
export default db;
