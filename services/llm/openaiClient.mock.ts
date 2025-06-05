// Mock implementation of openaiClient for testing
import { mock } from 'bun:test';

// Default mock response
const defaultParsedResponse = {
  score: 8,
  reasoning: 'Test reasoning',
  tags: ['test'],
  summary: 'Test summary',
  relevance: 8,
};

// Create mock functions
export const mockParse = mock(async () => ({
  choices: [
    {
      message: {
        parsed: defaultParsedResponse,
        refusal: null,
      },
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
}));

export const mockCreate = mock(async () => ({
  choices: [
    {
      message: {
        content: JSON.stringify(defaultParsedResponse),
        role: 'assistant',
      },
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
}));

export const mockEmbeddingsCreate = mock(async (params: any) => ({
  data: params.input.map((_: any, index: number) => ({
    embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
    index,
  })),
  usage: {
    prompt_tokens: params.input.length * 10,
    total_tokens: params.input.length * 10,
  },
}));

// Export mock openai client
export const openai = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
  beta: {
    chat: {
      completions: {
        parse: mockParse,
      },
    },
  },
  embeddings: {
    create: mockEmbeddingsCreate,
  },
};

export const model = 'gpt-4-test-model';
export const miniModel = 'gpt-3.5-turbo-test';
