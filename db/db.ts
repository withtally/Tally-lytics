import knex from 'knex';
import knexConfig from '../knexfile.js';

// Get the environment and configuration
const environment = process.env.NODE_ENV || 'development';
// @ts-expect-error - We know this is valid
const config = knexConfig[environment];

// Create the database connection
const db = knex(config);

// Export the database connection
export default db;
