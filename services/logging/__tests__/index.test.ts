// services/logging/__tests__/index.test.ts

import { describe, it, expect, jest } from '@jest/globals';

describe('logging index exports', () => {
  it('should export Logger as default from logger module', async () => {
    const module = await import('../index');
    expect(module.Logger).toBeDefined();
    expect(typeof module.Logger).toBe('function');
  });

  it('should export types from types module', async () => {
    const module = await import('../index');
    // LogLevel, LogConfig, LogOutput, etc. should be available
    // Note: These are TypeScript types so we can't test them at runtime
    // but we can test that the module imports without error
    expect(module).toBeDefined();
  });

  it('should export notifiers from notifiers module', async () => {
    const module = await import('../index');
    expect(module.consoleNotifier).toBeDefined();
    expect(typeof module.consoleNotifier).toBe('function');
    expect(module.smsNotifier).toBeDefined();
    expect(typeof module.smsNotifier).toBe('function');
  });

  it('should allow importing Logger directly', async () => {
    const { Logger } = await import('../index');
    expect(Logger).toBeDefined();
    expect(typeof Logger).toBe('function');
  });

  it('should allow importing notifiers directly', async () => {
    const { consoleNotifier, smsNotifier } = await import('../index');
    expect(consoleNotifier).toBeDefined();
    expect(typeof consoleNotifier).toBe('function');
    expect(smsNotifier).toBeDefined();
    expect(typeof smsNotifier).toBe('function');
  });

  it('should support destructured imports', async () => {
    const { Logger, consoleNotifier, smsNotifier } = await import('../index');

    expect(Logger).toBeDefined();
    expect(consoleNotifier).toBeDefined();
    expect(smsNotifier).toBeDefined();

    expect(typeof Logger).toBe('function');
    expect(typeof consoleNotifier).toBe('function');
    expect(typeof smsNotifier).toBe('function');
  });

  it('should provide consistent exports on multiple imports', async () => {
    const module1 = await import('../index');
    const module2 = await import('../index');

    expect(module1.Logger).toBe(module2.Logger);
    expect(module1.consoleNotifier).toBe(module2.consoleNotifier);
    expect(module1.smsNotifier).toBe(module2.smsNotifier);
  });

  it('should not export undefined values', async () => {
    const module = await import('../index');

    expect(module.Logger).not.toBeUndefined();
    expect(module.consoleNotifier).not.toBeUndefined();
    expect(module.smsNotifier).not.toBeUndefined();
  });

  it('should maintain module structure integrity', async () => {
    const module = await import('../index');

    // Should have at least the main exports
    const exportKeys = Object.keys(module);
    expect(exportKeys).toContain('Logger');
    expect(exportKeys).toContain('consoleNotifier');
    expect(exportKeys).toContain('smsNotifier');
  });

  it('should allow creating Logger instance through export', async () => {
    const { Logger } = await import('../index');

    expect(() => {
      const logger = new Logger({
        level: 'info',
        logFile: '/tmp/test.log',
      });
      return logger;
    }).not.toThrow();
  });

  it('should allow using notifiers through exports', async () => {
    const { consoleNotifier, smsNotifier } = await import('../index');

    expect(() => {
      consoleNotifier('info', 'Test message');
    }).not.toThrow();

    expect(() => {
      const smsNotify = smsNotifier('+1234567890');
      smsNotify('info', 'Test SMS');
    }).not.toThrow();
  });

  it('should work with CommonJS-style imports', async () => {
    const logging = await import('../index');

    expect(logging.Logger).toBeDefined();
    expect(logging.consoleNotifier).toBeDefined();
    expect(logging.smsNotifier).toBeDefined();
  });

  it('should handle re-exports correctly', async () => {
    // Test that re-exported modules maintain their functionality
    const { Logger, consoleNotifier } = await import('../index');

    const logger = new Logger({
      level: 'info',
      logFile: '/tmp/test-reexport.log',
    });

    expect(logger).toBeInstanceOf(Logger);
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should provide working examples from comments', async () => {
    const { Logger, consoleNotifier, smsNotifier } = await import('../index');

    // Test the example code from the comments
    expect(() => {
      const logger = new Logger({
        level: 'info',
        logFile: 'application.log',
      });

      logger.addNotifier(consoleNotifier);
      logger.addNotifier(smsNotifier('+1234567890'));

      logger.info('Application started', { version: '1.0.0' });
    }).not.toThrow();
  });

  it('should maintain export consistency across multiple test runs', async () => {
    for (let i = 0; i < 3; i++) {
      const module = await import('../index');

      expect(module.Logger).toBeDefined();
      expect(module.consoleNotifier).toBeDefined();
      expect(module.smsNotifier).toBeDefined();

      expect(typeof module.Logger).toBe('function');
      expect(typeof module.consoleNotifier).toBe('function');
      expect(typeof module.smsNotifier).toBe('function');
    }
  });

  it('should handle edge cases in module loading', async () => {
    // Test that imports work even with unusual conditions
    const promise1 = import('../index');
    const promise2 = import('../index');

    const [module1, module2] = await Promise.all([promise1, promise2]);

    expect(module1.Logger).toBe(module2.Logger);
    expect(module1.consoleNotifier).toBe(module2.consoleNotifier);
    expect(module1.smsNotifier).toBe(module2.smsNotifier);
  });
});
