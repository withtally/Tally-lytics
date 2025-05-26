/**
 * Environment variable type definitions
 */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;

    // Database configuration
    SUPABASE_CONNECTION_STRING?: string;
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_DB?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;

    // OpenAI configuration (required)
    OPENAI_API_KEY: string;
    OPENAI_ORG_ID: string;

    // Optional API keys
    CRON_API_KEY?: string;
    COINGECKO_PRO_API_KEY?: string;
    TALLY_API?: string;
    NEWS_API_KEY?: string;

    // LLM configuration
    LLM_MODEL?: string;
    LLM_MINI_MODEL?: string;

    // Forum-specific API keys (pattern)
    [key: `${string}_API_KEY`]: string | undefined;
    [key: `${string}_API_USERNAME`]: string | undefined;
    [key: `${string}_DISCOURSE_URL`]: string | undefined;
  }
}

export {};
