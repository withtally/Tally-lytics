import knex from 'knex';
import knexConfig from '../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];
// console.log('Selected environment:', environment);
// console.log('Database configuration:', {
//   ...config,
//   connection: {
//     ...config.connection,
//     password: '***', // Hide password in logs
//   },
// });

console.log('Selected environment:', environment);

const db = knex(config);

export default db;
