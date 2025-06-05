// services/validation/__tests__/cronValidator.test.ts
import { CronValidator } from '../cronValidator';

describe('CronValidator', () => {
  describe('validate', () => {
    // Valid schedules
    const validSchedules = [
      { schedule: '* * * * *', description: 'every minute' },
      { schedule: '0 * * * *', description: 'every hour' },
      { schedule: '0 0 * * *', description: 'daily at midnight' },
      { schedule: '0 0 1 * *', description: 'monthly on the 1st' },
      { schedule: '0 0 * * 0', description: 'weekly on Sunday' },
      { schedule: '*/5 * * * *', description: 'every 5 minutes' },
      { schedule: '0 0-23/2 * * *', description: 'every 2 hours' },
      { schedule: '0 0,12 * * *', description: 'at midnight and noon' },
      { schedule: '0 0 1 JAN *', description: 'yearly on January 1st' },
      { schedule: '0 0 * * MON', description: 'weekly on Monday' },
      { schedule: '0 0 1-7 * SUN', description: 'first Sunday of month' },
      { schedule: '30 2 * * *', description: 'daily at 2:30 AM' },
      { schedule: '15,45 * * * *', description: 'at 15 and 45 minutes past every hour' },
      { schedule: '0 9-17 * * MON-FRI', description: 'hourly on weekdays 9AM-5PM' },
    ];

    validSchedules.forEach(({ schedule, description }) => {
      it(`should accept valid schedule: ${description} (${schedule})`, () => {
        const result = CronValidator.validate(schedule);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    // Invalid schedules
    const invalidSchedules = [
      { schedule: '', error: 'Schedule must be a non-empty string' },
      { schedule: '* * * *', error: 'Schedule must have 5 or 6 fields' },
      { schedule: '* * * * * * *', error: 'Schedule must have 5 or 6 fields' },
      { schedule: '60 * * * *', error: 'minute value out of bounds: 60 (must be 0-59)' },
      { schedule: '* 24 * * *', error: 'hour value out of bounds: 24 (must be 0-23)' },
      { schedule: '* * 32 * *', error: 'dayOfMonth value out of bounds: 32 (must be 1-31)' },
      { schedule: '* * * 13 *', error: 'month value out of bounds: 13 (must be 1-12)' },
      { schedule: '* * * * 8', error: 'dayOfWeek value out of bounds: 8 (must be 0-7)' },
      { schedule: '*/0 * * * *', error: 'Invalid step value in minute: 0' },
      { schedule: '1-0 * * * *', error: 'Invalid range in minute: start must be less than end' },
      { schedule: 'abc * * * *', error: 'Invalid value in minute: abc' },
      { schedule: '* * * XYZ *', error: 'Invalid value in month: XYZ' },
      { schedule: '* * * * ABC', error: 'Invalid value in dayOfWeek: ABC' },
    ];

    invalidSchedules.forEach(({ schedule, error }) => {
      it(`should reject invalid schedule: ${schedule}`, () => {
        const result = CronValidator.validate(schedule);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(error);
      });
    });

    // Security tests - malicious characters
    const maliciousSchedules = [
      '* * * * *; rm -rf /',
      '* * * * * && echo "hacked"',
      '* * * * * | cat /etc/passwd',
      '* * * * * `whoami`',
      '* * * * * $(date)',
      '* * * * * > /dev/null',
      '* * * * * < /etc/passwd',
      '* * * * *\\nrm -rf /',
      '* * * * *\r\necho hacked',
      '* * * * *\x00',
      '* * * * *\x1F',
    ];

    maliciousSchedules.forEach(schedule => {
      it(`should reject schedule with malicious characters: ${schedule.substring(0, 20)}...`, () => {
        const result = CronValidator.validate(schedule);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Schedule contains invalid characters');
      });
    });

    // Edge cases
    it('should handle null input', () => {
      const result = CronValidator.validate(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Schedule must be a non-empty string');
    });

    it('should handle undefined input', () => {
      const result = CronValidator.validate(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Schedule must be a non-empty string');
    });

    it('should handle numeric input', () => {
      const result = CronValidator.validate(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Schedule must be a non-empty string');
    });

    it('should handle object input', () => {
      const result = CronValidator.validate({} as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Schedule must be a non-empty string');
    });

    // 6-field cron (with seconds)
    it('should accept valid 6-field schedule with seconds', () => {
      const result = CronValidator.validate('0 0 * * * *');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid seconds in 6-field schedule', () => {
      const result = CronValidator.validate('60 0 * * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('second value out of bounds: 60 (must be 0-59)');
    });
  });
});