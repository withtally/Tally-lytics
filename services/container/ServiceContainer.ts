// services/container/ServiceContainer.ts - Dependency injection container

import type { IOpenAIClient, OpenAIConfig } from '../interfaces/IOpenAIClient';
import type { ILogger, LoggerConfig, LogLevel } from '../interfaces/ILogger';
import type { IPostRepository } from '../../db/repositories/IPostRepository';
import type { ITopicRepository } from '../../db/repositories/ITopicRepository';
import { createOpenAIClient } from '../llm/OpenAIClientImpl';
import { Logger } from '../logging';
import { PostRepository } from '../../db/repositories/PostRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import { EmbeddingService } from '../llm/EmbeddingService';
import { TopicsService } from '../llm/TopicsServiceRefactored';
import db from '../../db/db';

/**
 * Service container for dependency injection
 * Manages creation and lifecycle of service dependencies
 */
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  /**
   * Register a service factory
   */
  register<T>(name: string, factory: () => T, singleton: boolean = false): void {
    this.services.set(name, { factory, singleton });
  }

  /**
   * Resolve a service by name
   */
  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory());
      }
      return this.singletons.get(name);
    }

    return service.factory();
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get OpenAI client
   */
  getOpenAIClient(): IOpenAIClient {
    return this.resolve<IOpenAIClient>('openai');
  }

  /**
   * Get logger instance
   */
  getLogger(config?: LoggerConfig): ILogger {
    if (config) {
      // Create new logger with specific config
      const fullConfig = {
        level: config.level || 'info',
        logFile: config.logFile || 'logs/app.log',
        ...config,
      };
      return new Logger(fullConfig);
    }
    return this.resolve<ILogger>('logger');
  }

  /**
   * Get post repository
   */
  getPostRepository(): IPostRepository {
    return this.resolve<IPostRepository>('postRepository');
  }

  /**
   * Get topic repository
   */
  getTopicRepository(): ITopicRepository {
    return this.resolve<ITopicRepository>('topicRepository');
  }

  /**
   * Get embedding service
   */
  getEmbeddingService(): EmbeddingService {
    return this.resolve<EmbeddingService>('embeddingService');
  }

  /**
   * Get topics service
   */
  getTopicsService(): TopicsService {
    return this.resolve<TopicsService>('topicsService');
  }
}

/**
 * Configure default services for production
 */
export function configureProductionServices(container: ServiceContainer): void {
  // OpenAI client
  container.register(
    'openai',
    () => {
      const config: OpenAIConfig = {
        apiKey: process.env.OPENAI_API_KEY!,
        organizationId: process.env.OPENAI_ORG_ID!,
        defaultModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
        defaultMiniModel: process.env.LLM_MINI_MODEL || 'gpt-3.5-turbo',
      };
      return createOpenAIClient(config);
    },
    true // singleton
  );

  // Default logger
  container.register(
    'logger',
    () => {
      const config = {
        level: (process.env.LOG_LEVEL as LogLevel) || 'info',
        logFile: 'logs/app.log',
      };
      return new Logger(config);
    },
    true // singleton
  );

  // Post repository
  container.register(
    'postRepository',
    () => new PostRepository(db),
    true // singleton
  );

  // Topic repository
  container.register(
    'topicRepository',
    () => new TopicRepository(db),
    true // singleton
  );

  // Embedding service
  container.register(
    'embeddingService',
    () => new EmbeddingService(container.getOpenAIClient(), container.getLogger()),
    true // singleton
  );

  // Topics service
  container.register(
    'topicsService',
    () =>
      new TopicsService(
        container.getOpenAIClient(),
        container.getTopicRepository(),
        container.getPostRepository(),
        container.getLogger()
      ),
    true // singleton
  );
}

/**
 * Configure services for testing
 */
export function configureTestServices(container: ServiceContainer): void {
  // Use mocks for testing
  const { openai } = require('../../__mocks__/openai');

  container.register('openai', () => openai, true);

  container.register(
    'logger',
    () => ({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
    true
  );

  // Use mock repositories
  const { MockPostRepository } = require('../../__tests__/mocks/MockPostRepository');
  container.register('postRepository', () => new MockPostRepository(), false);

  // Topic repository mock would go here
  container.register('topicRepository', () => new TopicRepository(db), false);

  // Use real services with mocked dependencies for integration testing
  container.register(
    'embeddingService',
    () => new EmbeddingService(container.resolve('openai'), container.resolve('logger')),
    false
  );

  container.register(
    'topicsService',
    () =>
      new TopicsService(
        container.resolve('openai'),
        container.resolve('topicRepository'),
        container.resolve('postRepository'),
        container.resolve('logger')
      ),
    false
  );
}

// Global service container instance
export const serviceContainer = new ServiceContainer();

// Auto-configure based on environment
if (process.env.NODE_ENV === 'test') {
  configureTestServices(serviceContainer);
} else {
  configureProductionServices(serviceContainer);
}
