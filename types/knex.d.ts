/**
 * Knex configuration type definitions
 */

export interface KnexConnectionConfig {
  host?: string;
  port?: string | number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export interface KnexConnectionStringConfig {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
}

export interface KnexEnvironmentConfig {
  client: string;
  connection: KnexConnectionConfig | KnexConnectionStringConfig;
  migrations: {
    directory: string;
  };
  pool: {
    min: number;
    max: number;
  };
  debug?: boolean;
}

export interface KnexConfig {
  development: KnexEnvironmentConfig;
  production: KnexEnvironmentConfig;
  test?: KnexEnvironmentConfig;
}

export type Environment = keyof KnexConfig;