// Mock OpenAI client for testing
import { mock } from 'bun:test';

// Default parsed response for post evaluation
const defaultPostEvaluation = {
  score: 8,
  reasoning: 'This is a mock evaluation reasoning',
  tags: ['governance', 'proposal', 'mock'],
  summary: 'This is a mock evaluation summary',
  relevance: 8,
};

// Default parsed response for topic evaluation
const defaultTopicEvaluation = {
  topic: 'Mock Topic',
  description: 'This is a mock topic description',
  relevance_score: 0.85,
  commonTopics: [
    { name: 'Topic 1', description: 'Description 1', confidence: 0.9 },
    { name: 'Topic 2', description: 'Description 2', confidence: 0.8 },
  ],
};

// Create the mock parse function
const mockParse = mock(async (params: any) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 10));

  // Determine response based on input
  let parsed = defaultPostEvaluation;

  if (params.messages && params.messages.length > 0) {
    const lastMessage = params.messages[params.messages.length - 1];
    const content =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    if (content.includes('topic')) {
      parsed = defaultTopicEvaluation;
    }
  }

  return {
    choices: [
      {
        message: {
          parsed,
          refusal: null,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
});

// Create the mock create function for regular completions
const mockCreate = mock(async (params: any) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 10));

  let content = 'This is a mock response from OpenAI.';

  if (params.messages && params.messages.length > 0) {
    const lastMessage = params.messages[params.messages.length - 1];

    if (lastMessage.content.includes('evaluate')) {
      content = JSON.stringify(defaultPostEvaluation);
    } else if (lastMessage.content.includes('topic')) {
      content = JSON.stringify(defaultTopicEvaluation);
    }
  }

  return {
    choices: [
      {
        message: {
          content,
          role: 'assistant',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
});

// Create embeddings mock
const mockEmbeddingsCreate = mock(async (params: any) => {
  await new Promise(resolve => setTimeout(resolve, 10));

  const embeddings = params.input.map((_: any, index: number) => ({
    embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
    index,
  }));

  return {
    data: embeddings,
    usage: {
      prompt_tokens: params.input.length * 10,
      total_tokens: params.input.length * 10,
    },
  };
});

// Export the mock OpenAI client
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

// Export model constants
export const model = 'gpt-4-test-model';
export const miniModel = 'gpt-3.5-turbo-test';

// Also export the mock functions for test access
export { mockParse, mockCreate, mockEmbeddingsCreate };
