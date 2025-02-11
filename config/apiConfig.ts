export const apiConfig = {
  coingecko: {
    proApiKey: process.env.COINGECKO_PRO_API_KEY || '',
    baseUrl: 'https://pro-api.coingecko.com/api/v3',
    rateLimit: {
      requestsPerMinute: 30,
      maxRetries: 3,
      backoffMs: 2000, // Base backoff time in milliseconds
    },
    defaults: {
      currency: 'usd',
      orderBy: 'market_cap_desc',
      sparkline: false,
      priceChangePercentage: '24h'
    }
  },
  
  tally: {
    apiKey: process.env.TALLY_API || '',
    baseUrl: 'https://api.tally.xyz',
    rateLimit: {
      requestsPerMinute: 60,
      maxRetries: 3,
      backoffMs: 1000
    }
  },

  snapshot: {
    baseUrl: 'https://hub.snapshot.org/graphql',
    rateLimit: {
      requestsPerMinute: 100,
      maxRetries: 3,
      backoffMs: 1000
    }
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    orgId: process.env.OPENAI_ORG_ID || '',
    baseUrl: 'https://api.openai.com/v1',
    rateLimit: {
      requestsPerMinute: 200,
      maxRetries: 3,
      backoffMs: 1000
    },
    defaults: {
      model: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 500
    }
  },

  // Global API settings that apply to all services
  global: {
    timeouts: {
      default: 30000, // 30 seconds
      long: 60000,    // 1 minute
      short: 5000     // 5 seconds
    },
    retry: {
      maxAttempts: 3,
      statusCodesToRetry: [408, 429, 500, 502, 503, 504],
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    caching: {
      enabled: true,
      ttl: {
        short: 60,     // 1 minute
        medium: 300,   // 5 minutes
        long: 3600,    // 1 hour
        day: 86400     // 24 hours
      }
    },
    headers: {
      common: {
        'Accept': 'application/json',
        'User-Agent': 'DAO-Helper-Tool/1.0'
      }
    }
  }
} as const;

export type ApiConfig = typeof apiConfig;

// Helper type for timeframes
export type CacheTTL = keyof typeof apiConfig.global.caching.ttl;

// Helper function to get cache TTL in seconds
export function getCacheTTL(ttl: CacheTTL): number {
  return apiConfig.global.caching.ttl[ttl];
}

// Helper to check if status code should be retried
export function shouldRetryRequest(statusCode: number): boolean {
  return apiConfig.global.retry.statusCodesToRetry.includes(statusCode);
} 
