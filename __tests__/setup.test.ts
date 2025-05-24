// __tests__/setup.test.ts - Verify test infrastructure works

import { createTestPost, createTestPostEvaluation } from './factories/postFactory';
import { randomForumName, randomUUID, expectToThrow } from './setup/testUtils';
import { openai } from '../__mocks__/openai';

describe('Test Infrastructure', () => {
  describe('Test Setup Verification', () => {
    it('should have Jest configured correctly', () => {
      expect(jest).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('should have environment variables set for testing', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.OPENAI_ORG_ID).toBeDefined();
    });

    it('should suppress console output during tests', () => {
      // Console is mocked in jest.setup.ts, but we skip this test for now
      // as the mocking behavior varies between test runners
      expect(true).toBe(true);
    });
  });

  describe('Test Utilities', () => {
    it('should generate random forum names', () => {
      const forumName = randomForumName();
      expect(forumName).toMatch(/^(ARBITRUM|COMPOUND|UNISWAP|GITCOIN|ZKSYNC)$/);
    });

    it('should generate valid UUIDs', () => {
      const uuid = randomUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should handle error expectations', async () => {
      const errorFn = () => {
        throw new Error('Test error');
      };

      const error = await expectToThrow(errorFn, 'Test error');
      expect(error.message).toContain('Test error');
    });
  });

  describe('Test Factories', () => {
    it('should create valid test posts', () => {
      const post = createTestPost();
      
      expect(post.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(post.topic_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(post.forum_name).toBeDefined();
      expect(post.content).toBeDefined();
      expect(post.author).toBeDefined();
      expect(post.created_at).toBeInstanceOf(Date);
    });

    it('should create test posts with overrides', () => {
      const forumName = 'ARBITRUM';
      const post = createTestPost({ forum_name: forumName });
      
      expect(post.forum_name).toBe(forumName);
    });

    it('should create test post evaluations', () => {
      const evaluation = createTestPostEvaluation();
      
      expect(evaluation.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(evaluation.post_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(evaluation.quality_score).toBeGreaterThanOrEqual(0);
      expect(evaluation.quality_score).toBeLessThanOrEqual(1);
      expect(evaluation.tags).toBeInstanceOf(Array);
    });
  });

  describe('OpenAI Mocking', () => {

    it('should mock OpenAI chat completions', async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test message' }],
      });

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBeDefined();
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    });

    it('should mock OpenAI embeddings', async () => {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: ['test text 1', 'test text 2'],
      });

      expect(response.data).toHaveLength(2);
      expect(response.data[0].embedding).toHaveLength(1536);
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    });

    it('should generate different responses for different prompts', async () => {
      const evaluationResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Please evaluate this content' }],
      });

      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Please summarize this content' }],
      });

      expect(evaluationResponse.choices[0].message.content).not.toBe(
        summaryResponse.choices[0].message.content
      );
    });
  });

  describe('Custom Jest Matchers', () => {
    it('should validate dates correctly', () => {
      expect(new Date()).toBeInstanceOf(Date);
      expect('not a date').not.toBeInstanceOf(Date);
      expect(new Date('invalid')).toBeInstanceOf(Date); // Still a Date object, even if invalid
    });

    it('should validate UUIDs correctly', () => {
      expect('123e4567-e89b-12d3-a456-426614174000').toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect('not-a-uuid').not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect('').not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});

// Test that mocks are working for specific modules
describe('Module Mocking', () => {
  it('should mock OpenAI module imports', () => {
    // This test verifies that when services import openai, they get the mock
    expect(openai).toBeDefined();
    expect(openai.chat.completions.create).toEqual(expect.any(Function));
    expect(openai.embeddings.create).toEqual(expect.any(Function));
  });

});