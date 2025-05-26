// __mocks__/openai.ts - Simple mock for OpenAI client

export interface MockChatCompletion {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MockStructuredCompletion {
  choices: Array<{
    message: {
      parsed: any;
      refusal: null | string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MockEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Helper to generate parsed responses based on content
function generateParsedResponse(params: any): any {
  if (params.messages && params.messages.length > 0) {
    const lastMessage = params.messages[params.messages.length - 1];
    const content = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    if (content.includes('evaluate') || content.includes('post')) {
      return {
        score: 8,
        reasoning: 'This is a mock evaluation reasoning',
        tags: ['governance', 'proposal', 'mock'],
        summary: 'This is a mock evaluation summary',
        relevance: 8,
      };
    } else if (content.includes('topic')) {
      return {
        topic: 'Mock Topic',
        description: 'This is a mock topic description',
        relevance_score: 0.85,
        commonTopics: [
          { name: 'Topic 1', description: 'Description 1', confidence: 0.9 },
          { name: 'Topic 2', description: 'Description 2', confidence: 0.8 },
        ],
      };
    }
  }

  // Default parsed response
  return {
    result: 'Mock parsed response',
    data: { key: 'value' },
  };
}

// Simple mock implementation
export const openai = {
  chat: {
    completions: {
      create: async (params: any): Promise<MockChatCompletion> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 10));

        // Generate mock response based on input
        let content = 'This is a mock response from OpenAI.';

        if (params.messages && params.messages.length > 0) {
          const lastMessage = params.messages[params.messages.length - 1];

          if (lastMessage.content.includes('evaluate')) {
            content = JSON.stringify({
              quality_score: 0.8,
              relevance_score: 0.9,
              summary: 'This is a mock evaluation summary',
              tags: ['governance', 'proposal', 'mock'],
            });
          } else if (lastMessage.content.includes('summarize')) {
            content = 'This is a mock summary of the content provided.';
          } else if (lastMessage.content.includes('topic')) {
            content = JSON.stringify({
              topic: 'Mock Topic',
              description: 'This is a mock topic description',
              relevance_score: 0.85,
            });
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
      },
    },
  },

  // Beta API for structured outputs
  beta: {
    chat: {
      completions: {
        parse: async (params: any): Promise<MockStructuredCompletion> => {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 10));

          const parsed = generateParsedResponse(params);

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
        },
      },
    },
  },

  embeddings: {
    create: async (params: any): Promise<MockEmbeddingResponse> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Generate mock embeddings
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
    },
  },
};

// Export model constants
export const model = 'gpt-3.5-turbo';
export const miniModel = 'gpt-3.5-turbo';

// Export OpenAI constructor for mocking
export class OpenAI {
  chat = openai.chat;
  beta = openai.beta;
  embeddings = openai.embeddings;
  
  constructor(config?: any) {
    // Mock constructor
  }
}

// Default export for ES modules
export default OpenAI;
