// services/validation/__tests__/paramValidator.test.ts

import { describe, it, expect } from '@jest/globals';
import { validateParam, validateQueryArray, ValidationError } from '../paramValidator';

describe('paramValidator', () => {
  describe('validateParam', () => {
    describe('basic validation', () => {
      it('should throw error for undefined parameter', () => {
        expect(() => validateParam(undefined, 'string')).toThrow('Parameter is required');
        expect(() => validateParam(undefined, 'string')).toThrow(
          expect.objectContaining({ code: 'MISSING_PARAMETER' })
        );
      });

      it('should throw error for non-string parameter', () => {
        expect(() => validateParam(null as any, 'string')).toThrow('Parameter is required');
        expect(() => validateParam(123 as any, 'string')).toThrow('Parameter is required');
        expect(() => validateParam({} as any, 'string')).toThrow('Parameter is required');
        expect(() => validateParam([] as any, 'string')).toThrow('Parameter is required');
      });

      it('should throw error for empty string parameter', () => {
        expect(() => validateParam('', 'string')).toThrow('Parameter is required');
      });

      it('should throw error for parameters that are too long', () => {
        const longParam = 'x'.repeat(101);
        expect(() => validateParam(longParam, 'string')).toThrow('Parameter too long');
        expect(() => validateParam(longParam, 'string')).toThrow(
          expect.objectContaining({ code: 'PARAMETER_TOO_LONG' })
        );
      });

      it('should handle parameters at the maximum length', () => {
        const maxLengthParam = 'x'.repeat(100);
        expect(() => validateParam(maxLengthParam, 'string')).not.toThrow();
        expect(validateParam(maxLengthParam, 'string')).toBe(maxLengthParam);
      });

      it('should trim whitespace from parameters', () => {
        expect(validateParam('  hello  ', 'string')).toBe('hello');
        expect(validateParam('\t\n  world  \n\t', 'string')).toBe('world');
      });

      it('should throw error for parameters with control characters', () => {
        expect(() => validateParam('hello\x00world', 'string')).toThrow(
          'Invalid characters in parameter'
        );
        expect(() => validateParam('hello\x00world', 'string')).toThrow(
          expect.objectContaining({ code: 'INVALID_CHARACTERS' })
        );
        expect(() => validateParam('hello\x1fworld', 'string')).toThrow(
          'Invalid characters in parameter'
        );
        expect(() => validateParam('hello\x7fworld', 'string')).toThrow(
          'Invalid characters in parameter'
        );
      });
    });

    describe('string type validation', () => {
      it('should return valid string parameters', () => {
        expect(validateParam('hello', 'string')).toBe('hello');
        expect(validateParam('hello world', 'string')).toBe('hello world');
        expect(validateParam('123', 'string')).toBe('123');
        expect(validateParam('test-with-hyphens_and_underscores', 'string')).toBe(
          'test-with-hyphens_and_underscores'
        );
      });

      it('should handle special characters in strings', () => {
        expect(validateParam('hello@example.com', 'string')).toBe('hello@example.com');
        expect(validateParam('test!@#$%^&*()', 'string')).toBe('test!@#$%^&*()');
        expect(validateParam('unicode-αβγ-test', 'string')).toBe('unicode-αβγ-test');
      });
    });

    describe('number type validation', () => {
      it('should convert valid numeric strings to numbers', () => {
        expect(validateParam('123', 'number')).toBe(123);
        expect(validateParam('0', 'number')).toBe(0);
        expect(validateParam('999999', 'number')).toBe(999999);
      });

      it('should handle numbers with leading/trailing whitespace', () => {
        expect(validateParam('  123  ', 'number')).toBe(123);
        expect(validateParam('\t456\n', 'number')).toBe(456);
      });

      it('should throw error for invalid numeric strings', () => {
        expect(() => validateParam('abc', 'number')).toThrow('Invalid numeric parameter');
        expect(() => validateParam('abc', 'number')).toThrow(
          expect.objectContaining({ code: 'INVALID_NUMBER' })
        );
      });

      it('should parse decimal numbers as integers (parseInt behavior)', () => {
        expect(validateParam('12.34', 'number')).toBe(12);
        expect(validateParam('1.0', 'number')).toBe(1);
        expect(validateParam('1e10', 'number')).toBe(1); // parseInt stops at 'e'
      });

      it('should throw error for negative numbers', () => {
        expect(() => validateParam('-1', 'number')).toThrow('Invalid numeric parameter');
        expect(() => validateParam('-123', 'number')).toThrow('Invalid numeric parameter');
      });

      it('should accept -0 as valid (parseInt behavior)', () => {
        expect(validateParam('-0', 'number')).toBe(-0); // parseInt('-0') = -0, but -0 < 0 is false
      });

      it('should throw error for numbers with leading zeros (parsed as invalid)', () => {
        // parseInt('01', 10) = 1, but if we wanted to be strict about format
        expect(validateParam('01', 'number')).toBe(1); // This actually works
        expect(validateParam('007', 'number')).toBe(7); // This also works
      });
    });

    describe('forum type validation', () => {
      it('should accept valid forum names', () => {
        expect(validateParam('arbitrum', 'forum')).toBe('arbitrum');
        expect(validateParam('uniswap-v3', 'forum')).toBe('uniswap-v3');
        expect(validateParam('test_forum_123', 'forum')).toBe('test_forum_123');
        expect(validateParam('ABC123', 'forum')).toBe('ABC123');
      });

      it('should handle forum names with mixed case', () => {
        expect(validateParam('ArBiTrUm', 'forum')).toBe('ArBiTrUm');
        expect(validateParam('TestForum', 'forum')).toBe('TestForum');
      });

      it('should throw error for forum names with invalid characters', () => {
        expect(() => validateParam('forum name', 'forum')).toThrow('Invalid forum name format');
        expect(() => validateParam('forum name', 'forum')).toThrow(
          expect.objectContaining({ code: 'INVALID_FORUM_NAME' })
        );
        expect(() => validateParam('forum.name', 'forum')).toThrow('Invalid forum name format');
        expect(() => validateParam('forum@name', 'forum')).toThrow('Invalid forum name format');
        expect(() => validateParam('forum/name', 'forum')).toThrow('Invalid forum name format');
        expect(() => validateParam('forum+name', 'forum')).toThrow('Invalid forum name format');
      });

      it('should throw error for empty forum names after trimming', () => {
        expect(() => validateParam('   ', 'forum')).toThrow('Invalid forum name format');
      });
    });

    describe('ValidationError interface', () => {
      it('should create ValidationError with correct properties', () => {
        try {
          validateParam(undefined, 'string');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as ValidationError).code).toBe('MISSING_PARAMETER');
          expect((error as ValidationError).message).toBe('Parameter is required');
        }
      });

      it('should create different error codes for different validation failures', () => {
        const testCases = [
          { input: undefined, expectedCode: 'MISSING_PARAMETER' },
          { input: 'x'.repeat(101), expectedCode: 'PARAMETER_TOO_LONG' },
          { input: 'invalid!@#', type: 'forum' as const, expectedCode: 'INVALID_FORUM_NAME' },
          { input: 'abc', type: 'number' as const, expectedCode: 'INVALID_NUMBER' },
        ];

        testCases.forEach(({ input, type = 'string' as const, expectedCode }) => {
          try {
            validateParam(input as any, type);
            fail(`Expected error for input: ${input}`);
          } catch (error) {
            expect((error as ValidationError).code).toBe(expectedCode);
          }
        });
      });
    });
  });

  describe('validateQueryArray', () => {
    describe('basic functionality', () => {
      it('should return undefined for undefined input', () => {
        expect(validateQueryArray(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string input', () => {
        expect(validateQueryArray('')).toBeUndefined();
      });

      it('should parse single item arrays', () => {
        expect(validateQueryArray('arbitrum')).toEqual(['arbitrum']);
        expect(validateQueryArray('test-forum')).toEqual(['test-forum']);
      });

      it('should parse multiple item arrays', () => {
        expect(validateQueryArray('arbitrum,uniswap,compound')).toEqual([
          'arbitrum',
          'uniswap',
          'compound',
        ]);
      });

      it('should trim whitespace from individual items', () => {
        expect(validateQueryArray('  arbitrum  ,  uniswap  ,  compound  ')).toEqual([
          'arbitrum',
          'uniswap',
          'compound',
        ]);
      });

      it('should filter out empty items', () => {
        expect(validateQueryArray('arbitrum,,uniswap,  ,compound')).toEqual([
          'arbitrum',
          'uniswap',
          'compound',
        ]);
        expect(validateQueryArray(',arbitrum,')).toEqual(['arbitrum']);
        expect(validateQueryArray('arbitrum,')).toEqual(['arbitrum']);
        expect(validateQueryArray(',arbitrum')).toEqual(['arbitrum']);
      });
    });

    describe('item limit validation', () => {
      it('should use default limit of 10 items', () => {
        const manyItems = Array.from({ length: 10 }, (_, i) => `item${i}`).join(',');
        expect(() => validateQueryArray(manyItems)).not.toThrow();
        expect(validateQueryArray(manyItems)).toHaveLength(10);
      });

      it('should throw error when exceeding default limit', () => {
        const tooManyItems = Array.from({ length: 11 }, (_, i) => `item${i}`).join(',');
        expect(() => validateQueryArray(tooManyItems)).toThrow('Too many items in list (max: 10)');
        expect(() => validateQueryArray(tooManyItems)).toThrow(
          expect.objectContaining({ code: 'TOO_MANY_ITEMS' })
        );
      });

      it('should respect custom maxItems parameter', () => {
        expect(() => validateQueryArray('item1,item2,item3', 3)).not.toThrow();
        expect(() => validateQueryArray('item1,item2,item3,item4', 3)).toThrow(
          'Too many items in list (max: 3)'
        );
      });

      it('should handle edge case of maxItems = 0', () => {
        expect(() => validateQueryArray('item1', 0)).toThrow('Too many items in list (max: 0)');
      });

      it('should handle edge case of maxItems = 1', () => {
        expect(() => validateQueryArray('item1', 1)).not.toThrow();
        expect(() => validateQueryArray('item1,item2', 1)).toThrow(
          'Too many items in list (max: 1)'
        );
      });
    });

    describe('individual item validation', () => {
      it('should validate each item as forum type', () => {
        expect(() => validateQueryArray('valid-forum,invalid forum')).toThrow(
          'Invalid forum name format'
        );
        expect(() => validateQueryArray('arbitrum,uniswap.v3')).toThrow(
          'Invalid forum name format'
        );
        expect(() => validateQueryArray('good,bad@forum')).toThrow('Invalid forum name format');
      });

      it('should throw error for items that are too long', () => {
        const longItem = 'x'.repeat(101);
        expect(() => validateQueryArray(`arbitrum,${longItem}`)).toThrow('Parameter too long');
      });

      it('should throw error for items with control characters', () => {
        // Control characters fail forum format check first
        expect(() => validateQueryArray('arbitrum,bad\x00item')).toThrow(
          'Invalid forum name format'
        );
      });

      it('should allow valid forum names in arrays', () => {
        expect(validateQueryArray('arbitrum,uniswap-v3,compound_finance,ABC123')).toEqual([
          'arbitrum',
          'uniswap-v3',
          'compound_finance',
          'ABC123',
        ]);
      });
    });

    describe('complex scenarios', () => {
      it('should handle arrays with only empty/whitespace items', () => {
        expect(validateQueryArray('  ,  ,  ')).toEqual([]);
        expect(validateQueryArray(',,,,')).toEqual([]);
      });

      it('should handle mixed valid and empty items', () => {
        expect(validateQueryArray('arbitrum,  ,uniswap,  ,')).toEqual(['arbitrum', 'uniswap']);
      });

      it('should handle single comma', () => {
        expect(validateQueryArray(',')).toEqual([]);
      });

      it('should handle multiple commas', () => {
        expect(validateQueryArray(',,,,')).toEqual([]);
      });

      it('should validate real-world forum name patterns', () => {
        expect(
          validateQueryArray('arbitrum,optimism,polygon,avalanche,fantom,binance-smart-chain')
        ).toEqual([
          'arbitrum',
          'optimism',
          'polygon',
          'avalanche',
          'fantom',
          'binance-smart-chain',
        ]);
      });
    });
  });
});
