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

  describe('const', () => {
    it('converts a const to a literal', () => {
      const result = jsonSchemaToZod({ const: 'fixed' });
      expect(result.safeParse('fixed').success).toBe(true);
      expect(result.safeParse('other').success).toBe(false);
    });
  });

  describe('anyOf / oneOf', () => {
    it('converts anyOf to a union', () => {
      const result = jsonSchemaToZod({ anyOf: [{ type: 'string' }, { type: 'number' }] });
      expect(result.safeParse('x').success).toBe(true);
      expect(result.safeParse(5).success).toBe(true);
      expect(result.safeParse(true).success).toBe(false);
    });

    it('converts oneOf to a union', () => {
      const result = jsonSchemaToZod({ oneOf: [{ type: 'boolean' }, { type: 'null' }] });
      expect(result.safeParse(true).success).toBe(true);
      expect(result.safeParse(null).success).toBe(true);
      expect(result.safeParse('x').success).toBe(false);
    });
  });

  describe('allOf', () => {
    it('converts allOf to an intersection', () => {
      const result = jsonSchemaToZod({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
          { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
        ],
      });
      expect(result.safeParse({ a: 'x', b: 1 }).success).toBe(true);
      expect(result.safeParse({ a: 'x' }).success).toBe(false);
    });
  });

  describe('nullable type arrays', () => {
    it('treats ["string", "null"] as a nullable string', () => {
      const result = jsonSchemaToZod({ type: ['string', 'null'] });
      expect(result.safeParse('x').success).toBe(true);
      expect(result.safeParse(null).success).toBe(true);
      expect(result.safeParse(5).success).toBe(false);
    });
  });

  describe('string formats', () => {
    it('validates email format', () => {
      const result = jsonSchemaToZod({ type: 'string', format: 'email' });
      expect(result.safeParse('a@b.com').success).toBe(true);
      expect(result.safeParse('nope').success).toBe(false);
    });

    it('validates uuid format', () => {
      const result = jsonSchemaToZod({ type: 'string', format: 'uuid' });
      expect(result.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(result.safeParse('not-a-uuid').success).toBe(false);
    });

    it('validates uri/url format', () => {
      const result = jsonSchemaToZod({ type: 'string', format: 'uri' });
      expect(result.safeParse('https://example.com').success).toBe(true);
      expect(result.safeParse('not a url').success).toBe(false);
    });

    it('ignores an invalid regex pattern instead of throwing', () => {
      const result = jsonSchemaToZod({ type: 'string', pattern: '(' });
      expect(result.safeParse('anything').success).toBe(true);
    });
  });

  describe('default values', () => {
    it('applies a default for a missing property', () => {
      const result = jsonSchemaToZod({
        type: 'object',
        properties: { role: { type: 'string', default: 'user' } },
      });
      expect(result.parse({})).toEqual({ role: 'user' });
    });
  });

  describe('additionalProperties', () => {
    it('rejects extra keys when additionalProperties is false', () => {
      const result = jsonSchemaToZod({
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
        additionalProperties: false,
      });
      expect(result.safeParse({ a: 'x' }).success).toBe(true);
      expect(result.safeParse({ a: 'x', b: 1 }).success).toBe(false);
    });

    it('models a typed additionalProperties as a catchall', () => {
      const result = jsonSchemaToZod({
        type: 'object',
        properties: { a: { type: 'string' } },
        required: ['a'],
        additionalProperties: { type: 'number' },
      });
      expect(result.safeParse({ a: 'x', extra: 5 }).success).toBe(true);
      expect(result.safeParse({ a: 'x', extra: 'no' }).success).toBe(false);
    });

    it('models a property-less object with additionalProperties as a record', () => {
      const result = jsonSchemaToZod({ type: 'object', additionalProperties: { type: 'number' } });
      expect(result.safeParse({ x: 1, y: 2 }).success).toBe(true);
      expect(result.safeParse({ x: 'no' }).success).toBe(false);
    });
  });

  describe('tuples', () => {
    it('converts an items array to a tuple', () => {
      const result = jsonSchemaToZod({
        type: 'array',
        items: [{ type: 'string' }, { type: 'number' }],
      });
      expect(result.safeParse(['x', 1]).success).toBe(true);
      expect(result.safeParse([1, 'x']).success).toBe(false);
    });
  });

  describe('$ref', () => {
    it('resolves a local $ref to $defs', () => {
      const result = jsonSchemaToZod({
        type: 'object',
        properties: { user: { $ref: '#/$defs/User' } },
        required: ['user'],
        $defs: {
          User: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        },
      });
      expect(result.safeParse({ user: { name: 'Al' } }).success).toBe(true);
      expect(result.safeParse({ user: {} }).success).toBe(false);
    });

    it('resolves a recursive $ref', () => {
      const result = jsonSchemaToZod({
        $ref: '#/$defs/Node',
        $defs: {
          Node: {
            type: 'object',
            properties: { value: { type: 'number' }, next: { $ref: '#/$defs/Node' } },
            required: ['value'],
          },
        },
      });
      expect(result.safeParse({ value: 1, next: { value: 2 } }).success).toBe(true);
      expect(result.safeParse({ value: 1, next: { value: 'no' } }).success).toBe(false);
    });
  });

  describe('implicit objects', () => {
    it('treats a schema with properties but no type as an object', () => {
      const result = jsonSchemaToZod({ properties: { a: { type: 'string' } }, required: ['a'] });
      expect(result.safeParse({ a: 'x' }).success).toBe(true);
      expect(result.safeParse({}).success).toBe(false);
    });
  });
});
