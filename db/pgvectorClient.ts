import { Pool, PoolClient, PoolConfig } from 'pg';
import { registerType } from 'pgvector/pg';
import { Logger } from '../services/logging';

const logger = new Logger({ 
  level: 'info', 
  logFile: 'logs/database.log'
});
const environment = process.env.NODE_ENV || 'development';

// Base configuration for connection pooling
const basePoolConfig: Partial<PoolConfig> = {
  // Connection pool settings
  max: 20, // Maximum number of connections in pool
  min: 2, // Minimum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout for acquiring connection from pool
  // acquireTimeoutMillis: 10000, // Removed - not a valid Pool config property
  
  // Connection retry settings
  allowExitOnIdle: false, // Don't exit process when pool is idle
  
  // Statement timeout (30 seconds for long-running queries)
  statement_timeout: 30000,
  query_timeout: 30000,
};

let poolConfig: PoolConfig;

if (environment === 'development') {
  // Use local database configuration
  poolConfig = {
    ...basePoolConfig,
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: false,
  };
} else {
  // Use Supabase configuration for production
  poolConfig = {
    ...basePoolConfig,
    connectionString: process.env.SUPABASE_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

// Create connection pool
const pgVectorPool = new Pool(poolConfig);

// Pool event handlers for monitoring
pgVectorPool.on('connect', (client: PoolClient) => {
  logger.info('New client connected to database pool');
  // Register vector type for each new connection
  registerType(client);
});

pgVectorPool.on('acquire', () => {
  logger.debug('Client acquired from pool');
});

pgVectorPool.on('release', () => {
  logger.debug('Client released back to pool');
});

pgVectorPool.on('error', (err: Error) => {
  logger.error('Database pool error:', err);
});

pgVectorPool.on('remove', () => {
  logger.info('Client removed from pool');
});

// Connection pool wrapper with utility methods
class PgVectorClient {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a query using a pooled connection
   */
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for transaction use
   */
  async connect(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections in the pool
   */
  async end(): Promise<void> {
    logger.info('Closing database connection pool');
    await this.pool.end();
  }

  /**
   * Check if pool is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      logger.error('Database health check failed:', error as object);
      return false;
    }
  }
}

const pgVectorClient = new PgVectorClient(pgVectorPool);

// Function to initialize the pool and register vector type
async function initializePgVectorClient() {
  try {
    // Test the connection
    const isHealthy = await pgVectorClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    logger.info('Database connection pool initialized successfully', {
      environment,
      poolStats: pgVectorClient.getPoolStats(),
    });
  } catch (error) {
    logger.error('Failed to initialize database connection pool:', error as object);
    throw error;
  }
}

export { pgVectorClient, initializePgVectorClient };
