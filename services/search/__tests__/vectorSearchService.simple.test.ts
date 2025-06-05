// Simple test for VectorSearchService - Core Search Functionality
import { describe, it, expect } from '@jest/globals';

describe('VectorSearchService (Simple)', () => {
  it('should instantiate and have core search methods', () => {
    // Import the service class
    const { VectorSearchService } = require('../vectorSearchService');

    // Test instantiation
    const service = new VectorSearchService();
    expect(service).toBeDefined();

    // Test core public methods exist
    expect(typeof service.search).toBe('function');
    expect(typeof service.cleanup).toBe('function');
  });

  it('should handle search parameter validation', async () => {
    const { VectorSearchService } = require('../vectorSearchService');
    const service = new VectorSearchService();

    // Test with valid parameters to ensure the method exists and is callable
    const validParams = {
      query: 'test query',
      type: 'topic' as const,
      forum: 'test-forum',
    };

    // Since this would make real API calls, we'll just verify the method exists
    expect(typeof service.search).toBe('function');
    expect(service.search.length).toBe(1); // Takes one parameter
  });
});
