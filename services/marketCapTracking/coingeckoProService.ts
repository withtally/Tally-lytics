import { Logger } from '../logging';
import fetch from 'node-fetch';

export class CoingeckoProService {
  private readonly logger: Logger;
  private readonly baseUrl = 'https://pro-api.coingecko.com/api/v3';
  private readonly apiKey: string;
  private readonly defaultDelayMs = 1000; // Default delay when rate limit info is missing

  constructor() {
    this.logger = new Logger({ logFile: 'logs/coingecko-pro.log', level: 'info' });
    this.apiKey = process.env.COINGECKO_PRO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('COINGECKO_PRO_API_KEY environment variable is required');
    }
  }

  private validateTimestamps(from: number, to: number): void {
    if (!Number.isInteger(from) || !Number.isInteger(to)) {
      throw new Error('Timestamps must be integers');
    }
    if (from < 0 || to < 0) {
      throw new Error('Timestamps cannot be negative');
    }
    if (from >= to) {
      throw new Error('Start timestamp must be less than end timestamp');
    }
    if (to > Date.now() + 24 * 60 * 60 * 1000) {
      // Allow max 24h in future for any timezone differences
      throw new Error('End timestamp cannot be more than 24 hours in the future');
    }
  }

  private async makeRequest(url: string, attempt = 1): Promise<any> {
    const headers = {
      'Content-Type': 'application/json',
      'x-cg-pro-api-key': this.apiKey,
    };

    this.logger.debug('Making API request', { url: url.split('?')[0], attempt });

    try {
      const response = await fetch(url, { headers });
      const responseText = await response.text();

      // Parse rate limit headers
      const rateLimit = {
        remaining: Number(response.headers.get('x-ratelimit-remaining')),
        limit: Number(response.headers.get('x-ratelimit-limit')),
        reset: Number(response.headers.get('x-ratelimit-reset')),
      };

      // If rate limit headers are missing, use conservative approach
      if (!rateLimit.remaining && !rateLimit.limit && !rateLimit.reset) {
        this.logger.debug('Rate limit headers missing, using conservative delay');
        await new Promise(resolve => setTimeout(resolve, this.defaultDelayMs));
      }
      // If we know we're rate limited, wait for reset
      else if (rateLimit.remaining === 0 && rateLimit.reset) {
        const delayMs = rateLimit.reset * 1000 - Date.now() + 1000; // Add 1s buffer
        this.logger.info('Rate limit reached, waiting for reset', { delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.makeRequest(url, attempt + 1);
      }

      // Handle response status
      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status} - ${response.statusText}: ${responseText}`
        );
        if (response.status === 429) {
          this.logger.warn('Rate limit exceeded', { attempt, responseText });
          if (attempt < 3) {
            const delayMs = Math.min(this.defaultDelayMs * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return this.makeRequest(url, attempt + 1);
          }
        }
        throw error;
      }

      try {
        return JSON.parse(responseText);
      } catch (error) {
        this.logger.error('Failed to parse JSON response', {
          error,
          responsePreview: responseText.substring(0, 100), // Only log first 100 chars
        });
        throw new Error('Failed to parse API response');
      }
    } catch (error: any) {
      // Only retry network errors, not HTTP errors
      if (attempt < 3 && error.name !== 'Error') {
        const delayMs = Math.min(this.defaultDelayMs * Math.pow(2, attempt - 1), 10000);
        this.logger.warn(`Request failed, retrying in ${delayMs}ms`, {
          attempt,
          error: error.message,
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.makeRequest(url, attempt + 1);
      }
      throw error;
    }
  }

  async getTokenPrice(coingeckoId: string): Promise<any> {
    const url = `${this.baseUrl}/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
    try {
      return await this.makeRequest(url);
    } catch (error: any) {
      this.logger.error('Error fetching token price:', {
        coingeckoId,
        error: error.message,
      });
      throw error;
    }
  }

  async getCoinData(coingeckoId: string): Promise<any> {
    const url = `${this.baseUrl}/coins/${coingeckoId}`;
    try {
      return await this.makeRequest(url);
    } catch (error: any) {
      this.logger.error('Error fetching coin data:', {
        coingeckoId,
        error: error.message,
      });
      throw error;
    }
  }

  async getMarketChartRange(coingeckoId: string, from: number, to: number): Promise<any> {
    this.validateTimestamps(from, to);
    const url = `${this.baseUrl}/coins/${coingeckoId}/market_chart/range?vs_currency=usd&from=${Math.floor(from / 1000)}&to=${Math.floor(to / 1000)}`;
    return this.makeRequest(url);
  }
}
