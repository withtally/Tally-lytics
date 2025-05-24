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
      console.log('This should be mocked');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Test Utilities', () => {
    it('should generate random forum names', () => {
      const forumName = randomForumName();
      expect(forumName).toMatch(/^(ARBITRUM|COMPOUND|UNISWAP|GITCOIN|ZKSYNC)$/);
    });

    it('should generate valid UUIDs', () => {
      const uuid = randomUUID();
      expect(uuid).toBeValidUUID();
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
      
      expect(post.id).toBeValidUUID();
      expect(post.topic_id).toBeValidUUID();
      expect(post.forum_name).toBeDefined();
      expect(post.content).toBeDefined();
      expect(post.author).toBeDefined();
      expect(post.created_at).toBeValidDate();
    });

    it('should create test posts with overrides', () => {
      const forumName = 'ARBITRUM';
      const post = createTestPost({ forum_name: forumName });
      
      expect(post.forum_name).toBe(forumName);
    });

    it('should create test post evaluations', () => {
      const evaluation = createTestPostEvaluation();
      
      expect(evaluation.id).toBeValidUUID();
      expect(evaluation.post_id).toBeValidUUID();
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
      expect(new Date()).toBeValidDate();
      expect('not a date').not.toBeValidDate();
      expect(new Date('invalid')).not.toBeValidDate();
    });

    it('should validate UUIDs correctly', () => {
      expect('123e4567-e89b-12d3-a456-426614174000').toBeValidUUID();
      expect('not-a-uuid').not.toBeValidUUID();
      expect('').not.toBeValidUUID();
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