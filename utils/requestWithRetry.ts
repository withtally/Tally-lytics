// services/utils/requestWithRetry.ts
// This utility provides a fetch wrapper with retry logic, exponential backoff, and timeouts.
// It will help ensure reliability when calling external APIs.

const DEFAULT_MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3', 10);
const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10);

interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
}

export async function requestWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const maxRetries =
    retryOptions.retries !== undefined ? retryOptions.retries : DEFAULT_MAX_RETRIES;
  const timeoutMs =
    retryOptions.timeoutMs !== undefined ? retryOptions.timeoutMs : DEFAULT_TIMEOUT_MS;

  let attempt = 0;
  let shouldRetry = true;

  while (shouldRetry && attempt < maxRetries + 1) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        // If a 429 or 5xx error, consider retrying
        if ((response.status >= 500 || response.status === 429) && attempt <= maxRetries) {
          await backoff(attempt);
          continue;
        }
      }

      shouldRetry = false;
      return response;
    } catch (error: any) {
      clearTimeout(id);
      // Retry on network errors
      if (attempt <= maxRetries) {
        await backoff(attempt);
        continue;
      }

      // After max retries, throw error
      throw new Error(`Failed to fetch ${url} after ${attempt} attempts: ${error.message}`);
    }
  }
  throw new Error(`Failed to fetch ${url} after ${attempt} attempts`);
}

async function backoff(attempt: number): Promise<void> {
  const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
}
