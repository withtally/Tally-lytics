import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { consoleNotifier, smsNotifier } from '../notifiers';
import { LogMessage } from '../types';

describe('notifiers', () => {
  // Mock console.log to capture output
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('consoleNotifier', () => {
    it('should log notification with correct format for info level', () => {
      const message: LogMessage = {
        level: 'info',
        message: 'Test info message',
        meta: {},
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] info: Test info message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log notification with correct format for error level', () => {
      const message: LogMessage = {
        level: 'error',
        message: 'Test error message',
        meta: { stack: 'error stack' },
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] error: Test error message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log notification with correct format for warn level', () => {
      const message: LogMessage = {
        level: 'warn',
        message: 'Test warning message',
        meta: { code: 'WARN_001' },
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] warn: Test warning message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log notification with correct format for debug level', () => {
      const message: LogMessage = {
        level: 'debug',
        message: 'Test debug message',
        meta: { details: 'debugging info' },
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] debug: Test debug message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle empty message', () => {
      const message: LogMessage = {
        level: 'info',
        message: '',
        meta: {},
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION] info: ');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle message with special characters', () => {
      const message: LogMessage = {
        level: 'error',
        message: 'Test with special chars: @#$%^&*()[]{}',
        meta: {},
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[NOTIFICATION] error: Test with special chars: @#$%^&*()[]{}'
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle long messages', () => {
      const longMessage = 'a'.repeat(1000);
      const message: LogMessage = {
        level: 'info',
        message: longMessage,
        meta: {},
      };

      consoleNotifier(message);

      expect(consoleSpy).toHaveBeenCalledWith(`[NOTIFICATION] info: ${longMessage}`);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('smsNotifier', () => {
    it('should create SMS notifier function with phone number', () => {
      const phoneNumber = '+1234567890';
      const notifier = smsNotifier(phoneNumber);

      expect(typeof notifier).toBe('function');
    });

    it('should log SMS notification with correct format for info level', () => {
      const phoneNumber = '+1234567890';
      const notifier = smsNotifier(phoneNumber);
      const message: LogMessage = {
        level: 'info',
        message: 'Test SMS message',
        meta: {},
      };

      notifier(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending SMS to +1234567890: info - Test SMS message'
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should log SMS notification with correct format for error level', () => {
      const phoneNumber = '+0987654321';
      const notifier = smsNotifier(phoneNumber);
      const message: LogMessage = {
        level: 'error',
        message: 'Critical error occurred',
        meta: { errorCode: 'ERR_001' },
      };

      notifier(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending SMS to +0987654321: error - Critical error occurred'
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle different phone number formats', () => {
      const testCases = ['+1234567890', '1234567890', '+1-234-567-8900', '(123) 456-7890'];

      testCases.forEach((phoneNumber, index) => {
        const notifier = smsNotifier(phoneNumber);
        const message: LogMessage = {
          level: 'warn',
          message: `Test message ${index}`,
          meta: {},
        };

        notifier(message);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Sending SMS to ${phoneNumber}: warn - Test message ${index}`
        );
      });

      expect(consoleSpy).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle empty phone number', () => {
      const notifier = smsNotifier('');
      const message: LogMessage = {
        level: 'info',
        message: 'Test message',
        meta: {},
      };

      notifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to : info - Test message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle empty SMS message', () => {
      const phoneNumber = '+1234567890';
      const notifier = smsNotifier(phoneNumber);
      const message: LogMessage = {
        level: 'debug',
        message: '',
        meta: {},
      };

      notifier(message);

      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to +1234567890: debug - ');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should create independent notifier instances', () => {
      const phoneNumber1 = '+1111111111';
      const phoneNumber2 = '+2222222222';
      const notifier1 = smsNotifier(phoneNumber1);
      const notifier2 = smsNotifier(phoneNumber2);

      const message: LogMessage = {
        level: 'info',
        message: 'Test message',
        meta: {},
      };

      notifier1(message);
      notifier2(message);

      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to +1111111111: info - Test message');
      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to +2222222222: info - Test message');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in phone number', () => {
      const phoneNumber = '+1-800-TEST-SMS';
      const notifier = smsNotifier(phoneNumber);
      const message: LogMessage = {
        level: 'info',
        message: 'Test message',
        meta: {},
      };

      notifier(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending SMS to +1-800-TEST-SMS: info - Test message'
      );
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should preserve closure over phone number', () => {
      const phoneNumber = '+1234567890';
      const notifier = smsNotifier(phoneNumber);

      // Call multiple times to ensure phone number is preserved
      const message1: LogMessage = { level: 'info', message: 'Message 1', meta: {} };
      const message2: LogMessage = { level: 'error', message: 'Message 2', meta: {} };

      notifier(message1);
      notifier(message2);

      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to +1234567890: info - Message 1');
      expect(consoleSpy).toHaveBeenCalledWith('Sending SMS to +1234567890: error - Message 2');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid successive notifications', () => {
      const message: LogMessage = {
        level: 'info',
        message: 'Rapid notification',
        meta: {},
      };

      // Test console notifier
      for (let i = 0; i < 5; i++) {
        consoleNotifier(message);
      }

      // Test SMS notifier
      const smsNotify = smsNotifier('+1234567890');
      for (let i = 0; i < 3; i++) {
        smsNotify(message);
      }

      expect(consoleSpy).toHaveBeenCalledTimes(8); // 5 console + 3 SMS
    });

    it('should handle different log levels in sequence', () => {
      const levels = ['info', 'warn', 'error', 'debug'] as const;
      const phoneNumber = '+1234567890';
      const smsNotify = smsNotifier(phoneNumber);

      levels.forEach((level, index) => {
        const message: LogMessage = {
          level,
          message: `Test ${level} message`,
          meta: {},
        };

        consoleNotifier(message);
        smsNotify(message);
      });

      expect(consoleSpy).toHaveBeenCalledTimes(8); // 4 levels × 2 notifiers

      // Verify console calls
      levels.forEach(level => {
        expect(consoleSpy).toHaveBeenCalledWith(`[NOTIFICATION] ${level}: Test ${level} message`);
      });

      // Verify SMS calls
      levels.forEach(level => {
        expect(consoleSpy).toHaveBeenCalledWith(
          `Sending SMS to ${phoneNumber}: ${level} - Test ${level} message`
        );
      });
    });
  });
});
