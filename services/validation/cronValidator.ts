// services/validation/cronValidator.ts

/**
 * Validates cron schedule strings for security and correctness
 */
export class CronValidator {
  // Cron field ranges
  private static readonly FIELD_RANGES = {
    minute: { min: 0, max: 59 },
    hour: { min: 0, max: 23 },
    dayOfMonth: { min: 1, max: 31 },
    month: { min: 1, max: 12 },
    dayOfWeek: { min: 0, max: 7 }, // 0 and 7 both represent Sunday
  };

  // Month names mapping
  private static readonly MONTH_NAMES: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };

  // Day names mapping
  private static readonly DAY_NAMES: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };

  /**
   * Validates a cron schedule string
   * @param schedule The cron schedule string to validate
   * @returns An object with isValid boolean and optional error message
   */
  static validate(schedule: string): { isValid: boolean; error?: string } {
    if (!schedule || typeof schedule !== 'string') {
      return { isValid: false, error: 'Schedule must be a non-empty string' };
    }

    // Check for potentially malicious characters
    if (this.containsMaliciousCharacters(schedule)) {
      return { isValid: false, error: 'Schedule contains invalid characters' };
    }

    // Split into fields
    const fields = schedule.trim().split(/\s+/);
    
    // Standard cron has 5 fields (minute hour day month dayOfWeek)
    // Some implementations support 6 fields (adding seconds at the beginning)
    if (fields.length < 5 || fields.length > 6) {
      return { isValid: false, error: 'Schedule must have 5 or 6 fields' };
    }

    // If there's a 6th field, it means seconds are included at the beginning
    const hasSeconds = fields.length === 6;
    const startIndex = hasSeconds ? 1 : 0;

    // Field names for standard 5-field cron
    const fieldNames = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

    // If we have seconds, validate the first field as seconds
    if (hasSeconds) {
      const secondsValidation = this.validateField(fields[0], 'second');
      if (!secondsValidation.isValid) {
        return secondsValidation;
      }
    }

    // Validate the remaining fields
    for (let i = 0; i < 5; i++) {
      const fieldIndex = i + startIndex;
      const validation = this.validateField(fields[fieldIndex], fieldNames[i]);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true };
  }

  /**
   * Checks for potentially malicious characters
   */
  private static containsMaliciousCharacters(schedule: string): boolean {
    // Disallow shell metacharacters and control characters
    const maliciousPattern = /[;&|`$()<>\\\n\r\t\x00-\x1F\x7F]/;
    return maliciousPattern.test(schedule);
  }

  /**
   * Validates a single cron field
   */
  private static validateField(field: string, fieldName: string): { isValid: boolean; error?: string } {
    // Handle wildcards
    if (field === '*' || field === '?') {
      return { isValid: true };
    }

    // Handle ranges (e.g., "1-5")
    if (field.includes('-')) {
      return this.validateRange(field, fieldName);
    }

    // Handle steps (e.g., "asterisk/5" or "1-10/2")
    if (field.includes('/')) {
      return this.validateStep(field, fieldName);
    }

    // Handle lists (e.g., "1,3,5")
    if (field.includes(',')) {
      return this.validateList(field, fieldName);
    }

    // Handle single values
    return this.validateSingleValue(field, fieldName);
  }

  /**
   * Validates a range expression (e.g., "1-5")
   */
  private static validateRange(field: string, fieldName: string): { isValid: boolean; error?: string } {
    const parts = field.split('-');
    if (parts.length !== 2) {
      return { isValid: false, error: `Invalid range in ${fieldName}: ${field}` };
    }

    const start = this.parseValue(parts[0], fieldName);
    const end = this.parseValue(parts[1], fieldName);

    if (start === null || end === null) {
      return { isValid: false, error: `Invalid values in ${fieldName} range: ${field}` };
    }

    if (start >= end) {
      return { isValid: false, error: `Invalid range in ${fieldName}: start must be less than end` };
    }

    const range = this.getFieldRange(fieldName);
    if (start < range.min || end > range.max) {
      return { isValid: false, error: `${fieldName} range out of bounds: ${field}` };
    }

    return { isValid: true };
  }

  /**
   * Validates a step expression (e.g., "asterisk/5" or "1-10/2")
   */
  private static validateStep(field: string, fieldName: string): { isValid: boolean; error?: string } {
    const parts = field.split('/');
    if (parts.length !== 2) {
      return { isValid: false, error: `Invalid step in ${fieldName}: ${field}` };
    }

    const stepValue = this.parseValue(parts[1], fieldName);
    if (stepValue === null || stepValue <= 0) {
      return { isValid: false, error: `Invalid step value in ${fieldName}: ${parts[1]}` };
    }

    // Validate the base (before /)
    if (parts[0] === '*') {
      return { isValid: true };
    }

    // If base is a range, validate it
    if (parts[0].includes('-')) {
      return this.validateRange(parts[0], fieldName);
    }

    // Otherwise validate as single value
    return this.validateSingleValue(parts[0], fieldName);
  }

  /**
   * Validates a list expression (e.g., "1,3,5")
   */
  private static validateList(field: string, fieldName: string): { isValid: boolean; error?: string } {
    const values = field.split(',');
    
    for (const value of values) {
      const validation = this.validateSingleValue(value.trim(), fieldName);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true };
  }

  /**
   * Validates a single value
   */
  private static validateSingleValue(value: string, fieldName: string): { isValid: boolean; error?: string } {
    const parsed = this.parseValue(value, fieldName);
    if (parsed === null) {
      return { isValid: false, error: `Invalid value in ${fieldName}: ${value}` };
    }

    const range = this.getFieldRange(fieldName);
    if (parsed < range.min || parsed > range.max) {
      return { isValid: false, error: `${fieldName} value out of bounds: ${value} (must be ${range.min}-${range.max})` };
    }

    return { isValid: true };
  }

  /**
   * Parses a value, handling both numbers and named values (e.g., "JAN", "MON")
   */
  private static parseValue(value: string, fieldName: string): number | null {
    // Try parsing as number
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      return num;
    }

    // Handle named months
    if (fieldName === 'month') {
      const monthName = value.toLowerCase();
      return this.MONTH_NAMES[monthName] || null;
    }

    // Handle named days
    if (fieldName === 'dayOfWeek') {
      const dayName = value.toLowerCase();
      return this.DAY_NAMES[dayName] !== undefined ? this.DAY_NAMES[dayName] : null;
    }

    return null;
  }

  /**
   * Gets the valid range for a field
   */
  private static getFieldRange(fieldName: string): { min: number; max: number } {
    if (fieldName === 'second') {
      return { min: 0, max: 59 };
    }
    return this.FIELD_RANGES[fieldName as keyof typeof this.FIELD_RANGES] || { min: 0, max: 59 };
  }
}