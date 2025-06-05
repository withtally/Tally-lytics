// services/crawler/__tests__/apiService.test.ts

import { describe, it, expect } from '@jest/globals';
import { ApiService } from '../apiService';

describe('ApiService', () => {
  it('should export ApiService as a constructor', () => {
    expect(ApiService).toBeDefined();
    expect(typeof ApiService).toBe('function');
  });

  it('should have a constructor that accepts config and forum name', () => {
    expect(ApiService.length).toBe(2);
  });

  it('should have required methods', () => {
    const mockConfig = {
      apiKey: 'test-key',
      apiUsername: 'test-user',
      discourseUrl: 'https://test.com',
    };

    // Create instance to check methods exist
    const instance = new ApiService(mockConfig, 'test-forum');

    expect(typeof instance.fetchUserDetails).toBe('function');
    expect(typeof instance.fetchNewTopics).toBe('function');
    expect(typeof instance.fetchNewPosts).toBe('function');
  });

  it('should have fetchUserDetails method with 1 parameter', () => {
    const mockConfig = {
      apiKey: 'test-key',
      apiUsername: 'test-user',
      discourseUrl: 'https://test.com',
    };

    const instance = new ApiService(mockConfig, 'test-forum');
    expect(instance.fetchUserDetails.length).toBe(1);
  });

  it('should have fetchNewTopics method with 1 parameter', () => {
    const mockConfig = {
      apiKey: 'test-key',
      apiUsername: 'test-user',
      discourseUrl: 'https://test.com',
    };

    const instance = new ApiService(mockConfig, 'test-forum');
    expect(instance.fetchNewTopics.length).toBe(1);
  });

  it('should have fetchNewPosts method with 2 parameters', () => {
    const mockConfig = {
      apiKey: 'test-key',
      apiUsername: 'test-user',
      discourseUrl: 'https://test.com',
    };

    const instance = new ApiService(mockConfig, 'test-forum');
    expect(instance.fetchNewPosts.length).toBe(2);
  });
});
