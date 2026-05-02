import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonSchemaToZod } from './utils.js';

describe('jsonSchemaToZod', () => {
  it('should convert string type', () => {
    const result = jsonSchemaToZod({ type: 'string' });
    expect(result).toBeInstanceOf(z.ZodString);
    expect(result.safeParse('hello').success).toBe(true);
  });

  it('should convert string with constraints', () => {
    const result = jsonSchemaToZod({
      type: 'string',
      minLength: 2,
      maxLength: 5,
      pattern: '^[a-z]+$',
    });
    expect(result.safeParse('abc').success).toBe(true);
    expect(result.safeParse('a').success).toBe(false);
    expect(result.safeParse('abcdef').success).toBe(false);
    expect(result.safeParse('ABC').success).toBe(false);
  });

  it('should convert number type', () => {
    const result = jsonSchemaToZod({ type: 'number' });
    expect(result).toBeInstanceOf(z.ZodNumber);
    expect(result.safeParse(42).success).toBe(true);
  });

  it('should convert number with min/max', () => {
    const result = jsonSchemaToZod({ type: 'number', minimum: 0, maximum: 100 });
    expect(result.safeParse(50).success).toBe(true);
    expect(result.safeParse(-1).success).toBe(false);
    expect(result.safeParse(101).success).toBe(false);
  });

  it('should convert integer type', () => {
    const result = jsonSchemaToZod({ type: 'integer' });
    expect(result.safeParse(42).success).toBe(true);
    expect(result.safeParse(3.14).success).toBe(false);
  });

  it('should convert boolean type', () => {
    const result = jsonSchemaToZod({ type: 'boolean' });
    expect(result).toBeInstanceOf(z.ZodBoolean);
    expect(result.safeParse(true).success).toBe(true);
  });

  it('should convert null type', () => {
    const result = jsonSchemaToZod({ type: 'null' });
    expect(result).toBeInstanceOf(z.ZodNull);
    expect(result.safeParse(null).success).toBe(true);
  });

  it('should convert object type', () => {
    const result = jsonSchemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    });
    expect(result.safeParse({ name: 'John' }).success).toBe(true);
    expect(result.safeParse({}).success).toBe(false);
    expect(result.safeParse({ name: 'John', age: 30 }).success).toBe(true);
  });

  it('should convert array type', () => {
    const result = jsonSchemaToZod({
      type: 'array',
      items: { type: 'string' },
    });
    expect(result).toBeInstanceOf(z.ZodArray);
    expect(result.safeParse(['a', 'b']).success).toBe(true);
  });

  it('should convert string enum', () => {
    const result = jsonSchemaToZod({
      enum: ['a', 'b', 'c'],
    });
    expect(result.safeParse('a').success).toBe(true);
    expect(result.safeParse('d').success).toBe(false);
  });

  it('should convert mixed enum as literals', () => {
    const result = jsonSchemaToZod({
      enum: ['a', 1, true],
    });
    expect(result.safeParse('a').success).toBe(true);
    expect(result.safeParse(1).success).toBe(true);
    expect(result.safeParse(true).success).toBe(true);
    expect(result.safeParse('b').success).toBe(false);
  });

  it('should handle unknown type', () => {
    const result = jsonSchemaToZod({ type: 'unknown' });
    expect(result).toBeInstanceOf(z.ZodUnknown);
  });

  it('should handle empty/invalid input', () => {
    expect(jsonSchemaToZod({})).toBeInstanceOf(z.ZodUnknown);
    expect(jsonSchemaToZod(null as unknown as Record<string, unknown>)).toBeInstanceOf(
      z.ZodUnknown,
    );
    expect(jsonSchemaToZod('string' as unknown as Record<string, unknown>)).toBeInstanceOf(
      z.ZodUnknown,
    );
  });
});
