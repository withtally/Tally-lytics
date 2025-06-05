// services/crawler/__tests__/databaseService.test.ts

import { describe, it, expect } from '@jest/globals';
import { DatabaseService } from '../databaseService';

describe('DatabaseService', () => {
  it('should export DatabaseService as a constructor', () => {
    expect(DatabaseService).toBeDefined();
    expect(typeof DatabaseService).toBe('function');
  });

  it('should have a constructor that accepts knex config', () => {
    expect(DatabaseService.length).toBe(1);
  });

  it('should have required database methods', () => {
    // Create instance with empty config to check methods exist
    const instance = new DatabaseService({});

    expect(typeof instance.getLatestTopicTimestamp).toBe('function');
    expect(typeof instance.getLatestPostTimestamp).toBe('function');
    expect(typeof instance.insertPost).toBe('function');
    expect(typeof instance.insertTopic).toBe('function');
    expect(typeof instance.insertUser).toBe('function');
  });

  it('should have getLatestTopicTimestamp method with 1 parameter', () => {
    const instance = new DatabaseService({});
    expect(instance.getLatestTopicTimestamp.length).toBe(1);
  });

  it('should have getLatestPostTimestamp method with 1 parameter', () => {
    const instance = new DatabaseService({});
    expect(instance.getLatestPostTimestamp.length).toBe(1);
  });

  it('should have insertPost method with 2 parameters', () => {
    const instance = new DatabaseService({});
    expect(instance.insertPost.length).toBe(2);
  });

  it('should have insertTopic method with 2 parameters', () => {
    const instance = new DatabaseService({});
    expect(instance.insertTopic.length).toBe(2);
  });

  it('should have insertUser method with 2 parameters', () => {
    const instance = new DatabaseService({});
    expect(instance.insertUser.length).toBe(2);
  });
});
