// services/llm/OpenAIClientImpl.ts - Concrete OpenAI client implementation

import OpenAI from 'openai';
import type { 
  IOpenAIClient, 
  OpenAIConfig,
  ChatCompletionParams,
  ChatCompletionResponse,
  EmbeddingParams,
  EmbeddingResponse
} from '../interfaces/IOpenAIClient';

export class OpenAIClientImpl implements IOpenAIClient {
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      baseURL: config.baseURL,
    });
  }

  public chat = {
    completions: {
      create: async (params: ChatCompletionParams): Promise<ChatCompletionResponse> => {
        const response = await this.client.chat.completions.create(params);
        
        // Transform OpenAI response to our interface
        return {
          choices: response.choices.map(choice => ({
            message: {
              content: choice.message.content || '',
              role: choice.message.role,
            },
            finish_reason: choice.finish_reason || 'stop',
          })),
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
          },
        };
      },
    },
  };

  public embeddings = {
    create: async (params: EmbeddingParams): Promise<EmbeddingResponse> => {
      const response = await this.client.embeddings.create(params);
      
      // Transform OpenAI response to our interface
      return {
        data: response.data.map((item, index) => ({
          embedding: item.embedding,
          index,
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    },
  };
}

/**
 * Factory function to create OpenAI client
 */
export function createOpenAIClient(config: OpenAIConfig): IOpenAIClient {
  // In test environment, return mock
  if (process.env.NODE_ENV === 'test') {
    // Import dynamically to avoid issues with mocking
    const { openai } = require('../../__mocks__/openai');
    return openai;
  }
  
  return new OpenAIClientImpl(config);
}