// services/newsAPICrawler/__tests__/newsArticleEvaluationCrawler.test.ts
import { describe, it, expect } from '@jest/globals';
import { crawlNewsArticleEvaluations } from '../newsArticleEvaluationCrawler';

describe('newsArticleEvaluationCrawler', () => {
  it('should export crawlNewsArticleEvaluations function', () => {
    expect(crawlNewsArticleEvaluations).toBeDefined();
    expect(typeof crawlNewsArticleEvaluations).toBe('function');
  });

  it('should be an async function', () => {
    // Check that the function returns a promise
    const result = crawlNewsArticleEvaluations();
    expect(result).toBeInstanceOf(Promise);

    // Clean up the promise to avoid unhandled rejection
    result.catch(() => {});
  });
});
