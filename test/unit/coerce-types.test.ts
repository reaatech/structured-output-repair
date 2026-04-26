import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { coerceTypes, makeCoercedSchema } from '../../src/repair/coerce-types.js';
import { SchemaMismatchError } from '../../src/utils/errors.js';

describe('makeCoercedSchema', () => {
  it('should coerce string to number', () => {
    const schema = z.object({ age: z.number() });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ age: '30' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.age).toBe(30);
    }
  });

  it('should coerce string to boolean', () => {
    const schema = z.object({ active: z.boolean() });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ active: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
    }
  });

  it('should preserve optional fields', () => {
    const schema = z.object({ name: z.string(), age: z.number().optional() });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ name: 'John' });
    expect(result.success).toBe(true);
  });

  it('should preserve default values', () => {
    const schema = z.object({ count: z.number().default(0) });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(0);
    }
  });

  it('should handle nested objects', () => {
    const schema = z.object({
      user: z.object({ age: z.number() }),
    });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ user: { age: '25' } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.age).toBe(25);
    }
  });

  it('should handle arrays', () => {
    const schema = z.object({ items: z.array(z.number()) });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ items: ['1', '2', '3'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([1, 2, 3]);
    }
  });

  it('should handle unions', () => {
    const schema = z.union([z.number(), z.string()]);
    const coerced = makeCoercedSchema(schema);
    const numResult = coerced.safeParse('42');
    expect(numResult.success).toBe(true);
  });

  it('should pass through enums', () => {
    const schema = z.enum(['a', 'b', 'c']);
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse('a');
    expect(result.success).toBe(true);
  });

  it('should pass through literals', () => {
    const schema = z.literal(42);
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse(42);
    expect(result.success).toBe(true);
  });
});

describe('coerceTypes', () => {
  it('should coerce string to number', () => {
    const schema = z.object({ age: z.number() });
    const result = coerceTypes(schema, { age: '30' });
    expect(result).toEqual({ age: 30 });
  });

  it('should throw SchemaMismatchError for uncoercible data', () => {
    const schema = z.object({ age: z.number() });
    expect(() => coerceTypes(schema, { age: 'not-a-number' })).toThrow(SchemaMismatchError);
  });
});
