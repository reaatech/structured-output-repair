import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { removeExtraFields } from '../../src/repair/remove-extra-fields.js';

describe('removeExtraFields', () => {
  it('should remove extra top-level fields', () => {
    const schema = z.object({ name: z.string() }).strict();
    const data = { name: 'John', extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: 'John' });
  });

  it('should remove extra nested object fields', () => {
    const schema = z.object({
      user: z.object({ name: z.string() }).strict(),
    });
    const data = { user: { name: 'John', age: 30 } };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ user: { name: 'John' } });
  });

  it('should remove extra array item fields', () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.number() }).strict()),
    });
    const data = {
      items: [
        { id: 1, extra: 'a' },
        { id: 2, extra: 'b' },
      ],
    };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });

  it('should handle optional fields', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const data = { name: 'John', extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: 'John' });
  });

  it('should handle nullable fields', () => {
    const schema = z.object({
      name: z.string().nullable(),
    });
    const data = { name: null, extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: null });
  });

  it('should pass through primitives', () => {
    const schema = z.string();
    const data = 'hello';
    const result = removeExtraFields(schema, data);
    expect(result).toBe('hello');
  });

  it('should handle deeply nested structures', () => {
    const schema = z.object({
      a: z
        .object({
          b: z
            .object({
              c: z.string(),
            })
            .strict(),
        })
        .strict(),
    });
    const data = { a: { b: { c: 'deep', extra: 'x' }, extra: 'y' }, extra: 'z' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ a: { b: { c: 'deep' } } });
  });
});
