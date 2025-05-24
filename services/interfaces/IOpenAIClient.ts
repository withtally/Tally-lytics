// services/interfaces/IOpenAIClient.ts - Interface for OpenAI client

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface ChatCompletionResponse {
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

export interface EmbeddingParams {
  model: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Interface for OpenAI client operations
 * This abstraction allows for easy mocking and testing
 */
export interface IOpenAIClient {
  chat: {
    completions: {
      create(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
    };
  };
  
  embeddings: {
    create(params: EmbeddingParams): Promise<EmbeddingResponse>;
  };
}

/**
 * Configuration interface for OpenAI client
 */
export interface OpenAIConfig {
  apiKey: string;
  organizationId: string;
  baseURL?: string;
  defaultModel?: string;
  defaultMiniModel?: string;
}

/**
 * Factory function type for creating OpenAI clients
 */
export type OpenAIClientFactory = (config: OpenAIConfig) => IOpenAIClient;