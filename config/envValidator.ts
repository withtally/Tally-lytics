/**
 * Environment variable validation at startup
 */

interface EnvironmentConfig {
  required: string[];
  optional: string[];
}

const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  required: ['OPENAI_API_KEY', 'OPENAI_ORG_ID'],
  optional: [
    'NODE_ENV',
    'PORT',
    'SUPABASE_CONNECTION_STRING',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'CRON_API_KEY',
    'COINGECKO_PRO_API_KEY',
    'TALLY_API',
    'NEWS_API_KEY',
    'LLM_MODEL',
    'LLM_MINI_MODEL',
  ],
};

/**
 * Validates that all required environment variables are present
 * @throws Error if any required variables are missing
 */
export const validateEnvironment = (): void => {
  const missing = ENVIRONMENT_CONFIG.required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Log successful validation
  console.log('✅ Environment validation passed');
  console.log(`📍 Required variables (${ENVIRONMENT_CONFIG.required.length}): All present`);

  const presentOptional = ENVIRONMENT_CONFIG.optional.filter(key => process.env[key]);
  console.log(
    `🔧 Optional variables (${presentOptional.length}/${ENVIRONMENT_CONFIG.optional.length}): ${presentOptional.join(', ') || 'None'}`
  );
};

/**
 * Gets environment variable with validation and optional default
 */
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }

  return value || defaultValue!;
};

/**
 * Gets optional environment variable with type conversion
 */
export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];

  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }

  return parsed;
};
