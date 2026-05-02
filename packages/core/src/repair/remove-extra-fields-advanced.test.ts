import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { removeExtraFields } from './remove-extra-fields.js';

describe('removeExtraFields advanced types', () => {
  it('should handle ZodDefault', () => {
    const schema = z
      .object({
        name: z.string(),
        count: z.number().default(0),
      })
      .strict();
    const data = { name: 'test', count: 5, extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: 'test', count: 5 });
  });

  it('should handle ZodNullable', () => {
    const schema = z
      .object({
        name: z.string().nullable(),
      })
      .strict();
    const data = { name: null, extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: null });
  });

  it('should handle ZodArray', () => {
    const schema = z
      .object({
        items: z.array(z.object({ id: z.number() }).strict()),
      })
      .strict();
    const data = {
      items: [
        { id: 1, extra: 'a' },
        { id: 2, extra: 'b' },
      ],
    };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });

  it('should handle ZodRecord', () => {
    const schema = z
      .object({
        meta: z.record(z.object({ val: z.number() }).strict()),
      })
      .strict();
    const data = { meta: { a: { val: 1, extra: 'x' }, b: { val: 2 } } };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ meta: { a: { val: 1 }, b: { val: 2 } } });
  });

  it('should handle ZodTuple', () => {
    const schema = z
      .object({
        pair: z.tuple([z.object({ id: z.number() }).strict(), z.string()]),
      })
      .strict();
    const data = { pair: [{ id: 1, extra: 'x' }, 'hello'], extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ pair: [{ id: 1 }, 'hello'] });
  });

  it('should handle ZodTuple with rest', () => {
    const schema = z
      .object({
        items: z.tuple([z.string()]).rest(z.object({ id: z.number() }).strict()),
      })
      .strict();
    const data = { items: ['hello', { id: 1, extra: 'x' }, { id: 2 }] };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ items: ['hello', { id: 1 }, { id: 2 }] });
  });

  it('should handle ZodUnion', () => {
    const schema = z
      .object({
        val: z.union([z.object({ a: z.number() }).strict(), z.object({ b: z.string() }).strict()]),
      })
      .strict();
    const data = { val: { a: 1, extra: 'x' } };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ val: { a: 1 } });
  });

  it('should handle ZodDiscriminatedUnion', () => {
    const schema = z
      .object({
        item: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('a'), val: z.number() }).strict(),
          z.object({ kind: z.literal('b'), str: z.string() }).strict(),
        ]),
      })
      .strict();
    const data = { item: { kind: 'a', val: 1, extra: 'x' } };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ item: { kind: 'a', val: 1 } });
  });

  it('should handle ZodIntersection', () => {
    const schema = z.intersection(
      z.object({ a: z.number() }).strict(),
      z.object({ b: z.string() }).strict(),
    );
    const data = { a: 1, b: 'hello', extra: 'x' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('should handle ZodLazy', () => {
    type Node = { value: number; children?: Node[] };
    const nodeSchema: z.ZodType<Node> = z.lazy(() =>
      z
        .object({
          value: z.number(),
          children: z.array(nodeSchema).optional(),
        })
        .strict(),
    );
    const data = { value: 1, children: [{ value: 2, extra: 'x' }] };
    const result = removeExtraFields(nodeSchema, data);
    expect(result).toEqual({ value: 1, children: [{ value: 2 }] });
  });

  it('should pass through ZodEffects', () => {
    // ZodEffects can't be inspected; data is returned as-is
    const schema = z
      .object({
        val: z.number(),
      })
      .strict()
      .refine((data) => data.val > 0);
    const data = { val: 5, extra: 'x' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ val: 5, extra: 'x' });
  });

  it('should handle ZodMap', () => {
    const schema = z
      .object({
        data: z.map(z.string(), z.object({ id: z.number() }).strict()),
      })
      .strict();
    const map = new Map([['a', { id: 1, extra: 'x' }]]);
    const result = removeExtraFields(schema, { data: map });
    expect(result).toEqual({ data: new Map([['a', { id: 1 }]]) });
  });

  it('should handle ZodSet', () => {
    const schema = z
      .object({
        tags: z.set(z.object({ id: z.number() }).strict()),
      })
      .strict();
    const set = new Set([{ id: 1, extra: 'x' }]);
    const result = removeExtraFields(schema, { tags: set });
    expect(result).toEqual({ tags: new Set([{ id: 1 }]) });
  });

  it('should handle ZodPromise', () => {
    const schema = z
      .object({
        val: z.promise(z.number()),
      })
      .strict();
    const data = { val: Promise.resolve(42), extra: 'x' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ val: Promise.resolve(42) });
  });

  it('should handle ZodCatch', () => {
    const schema = z
      .object({
        val: z.number().catch(0),
      })
      .strict();
    const data = { val: 5, extra: 'x' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ val: 5 });
  });

  it('should pass through primitives', () => {
    expect(removeExtraFields(z.string(), 'hello')).toBe('hello');
    expect(removeExtraFields(z.number(), 42)).toBe(42);
    expect(removeExtraFields(z.boolean(), true)).toBe(true);
    expect(removeExtraFields(z.null(), null)).toBe(null);
    expect(removeExtraFields(z.undefined(), undefined)).toBe(undefined);
    expect(removeExtraFields(z.any(), { anything: true })).toEqual({ anything: true });
    expect(removeExtraFields(z.unknown(), { anything: true })).toEqual({ anything: true });
  });

  it('should not strip extra fields for passthrough schemas', () => {
    const schema = z
      .object({
        name: z.string(),
      })
      .passthrough();
    const data = { name: 'test', extra: 'field' };
    const result = removeExtraFields(schema, data);
    expect(result).toEqual({ name: 'test', extra: 'field' });
  });
});
