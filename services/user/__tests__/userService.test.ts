// services/user/__tests__/userService.test.ts

import { describe, it, expect } from '@jest/globals';

describe('UserService', () => {
  it('should export UserService class', () => {
    const { UserService } = require('../userService');

    expect(UserService).toBeDefined();
    expect(typeof UserService).toBe('function');
  });

  it('should have user management methods', () => {
    const { UserService } = require('../userService');

    // Verify methods exist on prototype
    expect(typeof UserService.prototype.fetchUserDetails).toBe('function');
    expect(typeof UserService.prototype.upsertUser).toBe('function');
    expect(typeof UserService.prototype.batchFetchAndUpsertUsers).toBe('function');
  });
});
