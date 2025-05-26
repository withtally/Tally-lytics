// services/tally/__tests__/logger.test.ts

import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Logger } from '../logger';
import { LogConfig } from '../types';

describe('Logger', () => {
  let logger: Logger;
  let mockConfig: LogConfig;

  beforeEach(() => {
    mockConfig = {
      level: 'info',
    };
  });

  describe('constructor', () => {
    it('should create logger instance with info level', () => {
      logger = new Logger(mockConfig);
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger instance with debug level', () => {
      const debugConfig: LogConfig = { level: 'debug' };
      logger = new Logger(debugConfig);
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger instance with error level', () => {
      const errorConfig: LogConfig = { level: 'error' };
      logger = new Logger(errorConfig);
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger instance with warn level', () => {
      const warnConfig: LogConfig = { level: 'warn' };
      logger = new Logger(warnConfig);
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('info method', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should accept string messages', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should handle empty string messages', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle messages with special characters', () => {
      expect(() => logger.info('Message with special chars: !@#$%^&*()')).not.toThrow();
    });

    it('should handle multi-line messages', () => {
      expect(() => logger.info('Line 1\nLine 2\nLine 3')).not.toThrow();
    });

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(1000);
      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('should handle messages with JSON content', () => {
      const jsonMessage = JSON.stringify({ key: 'value', number: 123 });
      expect(() => logger.info(jsonMessage)).not.toThrow();
    });
  });

  describe('error method', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should accept string messages', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should handle empty error messages', () => {
      expect(() => logger.error('')).not.toThrow();
    });

    it('should handle error messages with special characters', () => {
      expect(() => logger.error('Error: Failed to connect! @ 127.0.0.1:5432')).not.toThrow();
    });

    it('should handle complex error messages', () => {
      expect(() =>
        logger.error('Database connection failed: {code: ECONNREFUSED, errno: -61}')
      ).not.toThrow();
    });

    it('should handle stack trace messages', () => {
      const stackTrace =
        'Error: Something went wrong\n    at Function.test (/path/to/file.js:10:5)';
      expect(() => logger.error(stackTrace)).not.toThrow();
    });

    it('should handle error objects as strings', () => {
      const errorString = JSON.stringify({ message: 'Error occurred', code: 500 });
      expect(() => logger.error(errorString)).not.toThrow();
    });
  });

  describe('logger isolation', () => {
    it('should create separate logger instances', () => {
      const logger1 = new Logger({ level: 'info' });
      const logger2 = new Logger({ level: 'debug' });

      expect(logger1).not.toBe(logger2);
      expect(logger1).toBeInstanceOf(Logger);
      expect(logger2).toBeInstanceOf(Logger);
    });

    it('should handle multiple loggers logging simultaneously', () => {
      const logger1 = new Logger({ level: 'info' });
      const logger2 = new Logger({ level: 'error' });

      expect(() => {
        logger1.info('Info from logger1');
        logger2.error('Error from logger2');
        logger1.info('Another info from logger1');
        logger2.error('Another error from logger2');
      }).not.toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle valid log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];

      levels.forEach(level => {
        expect(() => {
          const logger = new Logger({ level: level as any });
        }).not.toThrow();
      });
    });

    it('should handle undefined config gracefully', () => {
      expect(() => {
        const logger = new Logger(undefined as any);
      }).toThrow();
    });

    it('should handle null config gracefully', () => {
      expect(() => {
        const logger = new Logger(null as any);
      }).toThrow();
    });

    it('should handle empty config object', () => {
      expect(() => {
        const logger = new Logger({} as any);
      }).not.toThrow();
    });

    it('should handle invalid log level strings', () => {
      expect(() => {
        const logger = new Logger({ level: 'invalid-level' as any });
      }).not.toThrow();
    });

    it('should work with numeric log level if accidentally passed', () => {
      expect(() => {
        const logger = new Logger({ level: 123 as any });
      }).not.toThrow();
    });

    it('should handle boolean log level if accidentally passed', () => {
      expect(() => {
        const logger = new Logger({ level: true as any });
      }).not.toThrow();
    });
  });

  describe('method chaining and continued usage', () => {
    beforeEach(() => {
      logger = new Logger(mockConfig);
    });

    it('should allow multiple consecutive info calls', () => {
      expect(() => {
        logger.info('First message');
        logger.info('Second message');
        logger.info('Third message');
      }).not.toThrow();
    });

    it('should allow multiple consecutive error calls', () => {
      expect(() => {
        logger.error('First error');
        logger.error('Second error');
        logger.error('Third error');
      }).not.toThrow();
    });

    it('should allow mixed info and error calls', () => {
      expect(() => {
        logger.info('Info message');
        logger.error('Error message');
        logger.info('Another info');
        logger.error('Another error');
      }).not.toThrow();
    });

    it('should maintain logger instance state across calls', () => {
      // Test that the logger instance remains consistent
      const initialLogger = logger;

      logger.info('Test message 1');
      logger.error('Test error 1');
      logger.info('Test message 2');

      expect(logger).toBe(initialLogger);
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('configuration variations', () => {
    it('should work with minimal config', () => {
      expect(() => {
        const logger = new Logger({ level: 'info' });
        logger.info('Test message');
        logger.error('Test error');
      }).not.toThrow();
    });

    it('should work with all winston log levels', () => {
      const winstonLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

      winstonLevels.forEach(level => {
        expect(() => {
          const logger = new Logger({ level: level as any });
          logger.info('Test info');
          logger.error('Test error');
        }).not.toThrow();
      });
    });
  });
});
