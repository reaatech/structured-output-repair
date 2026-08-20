import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isZodV4Schema } from '../utils/zod-internals.js';
import { makeCoercedSchema } from './coerce-types.js';

describe('makeCoercedSchema advanced types', () => {
  it('should coerce ZodNullable', () => {
    const schema = z.object({ val: z.number().nullable() });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({ val: '42' }).success).toBe(true);
    expect(coerced.safeParse({ val: null }).success).toBe(true);
  });

  it('should coerce ZodDefault', () => {
    const schema = z.object({ count: z.number().default(5) });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({}).success).toBe(true);
    expect(coerced.safeParse({ count: '10' }).success).toBe(true);
  });

  it('should coerce ZodTuple', () => {
    const schema = z.tuple([z.string(), z.number()]);
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse(['hello', '42']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[1]).toBe(42);
    }
  });

  it('should coerce ZodTuple with rest', () => {
    const schema = z.tuple([z.string()]).rest(z.number());
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse(['hello', '1', '2']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(['hello', 1, 2]);
    }
  });

  it('should coerce ZodRecord', () => {
    const schema = z.record(z.number());
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ a: '1', b: '2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1, b: 2 });
    }
  });

  it('should coerce ZodUnion', () => {
    const schema = z.union([z.string(), z.number()]);
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse('hello').success).toBe(true);
    expect(coerced.safeParse('42').success).toBe(true);
  });

  it('should coerce ZodIntersection', () => {
    const schema = z.intersection(z.object({ a: z.number() }), z.object({ b: z.string() }));
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ a: '1', b: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1, b: 'hello' });
    }
  });

  it('should coerce ZodLazy', () => {
    type Node = { value: number; children?: Node[] };
    const nodeSchema: z.ZodType<Node> = z.lazy(() =>
      z.object({
        value: z.number(),
        children: z.array(nodeSchema).optional(),
      }),
    );
    const coerced = makeCoercedSchema(nodeSchema);
    const result = coerced.safeParse({ value: '1', children: [{ value: '2' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(1);
      expect(result.data.children?.[0]?.value).toBe(2);
    }
  });

  it('should pass through ZodEffects', () => {
    const schema = z.object({ val: z.number() }).refine((data) => data.val > 0);
    const coerced = makeCoercedSchema(schema);
    // Effects can't be coerced, so it should still require a number
    expect(coerced.safeParse({ val: '42' }).success).toBe(false);
    expect(coerced.safeParse({ val: 42 }).success).toBe(true);
  });

  it('should pass through ZodPromise', () => {
    const schema = z.promise(z.number());
    const coerced = makeCoercedSchema(schema);
    expect(coerced).toBeInstanceOf(z.ZodPromise);
  });

  it('should coerce ZodDate', () => {
    const schema = z.object({ created: z.date() });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ created: '2024-01-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.created).toBeInstanceOf(Date);
    }
  });

  it('should coerce ZodBigInt', () => {
    const schema = z.object({ id: z.bigint() });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ id: '123456789' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(123456789n);
    }
  });

  it('should coerce ZodCatch', () => {
    const schema = z.object({ val: z.number().catch(0) });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({ val: '42' }).success).toBe(true);
  });

  it('should coerce ZodMap', () => {
    const schema = z.map(z.string(), z.number());
    const coerced = makeCoercedSchema(schema);
    const map = new Map([['a', '1']]);
    const result = coerced.safeParse(map);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.get('a')).toBe(1);
    }
  });

  it('should coerce ZodSet', () => {
    const schema = z.set(z.number());
    const coerced = makeCoercedSchema(schema);
    const set = new Set(['1', '2']);
    const result = coerced.safeParse(set);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.has(1)).toBe(true);
      expect(result.data.has(2)).toBe(true);
    }
  });

  it('should coerce ZodDiscriminatedUnion', () => {
    const schema = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('a'), val: z.number() }),
      z.object({ kind: z.literal('b'), str: z.string() }),
    ]);
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ kind: 'a', val: '42' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.val).toBe(42);
    }
  });

  it('should pass through ZodLiteral', () => {
    const schema = z.object({ val: z.literal(42) });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({ val: 42 }).success).toBe(true);
    expect(coerced.safeParse({ val: 43 }).success).toBe(false);
  });

  it('should pass through ZodEnum', () => {
    const schema = z.object({ val: z.enum(['a', 'b']) });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({ val: 'a' }).success).toBe(true);
    expect(coerced.safeParse({ val: 'c' }).success).toBe(false);
  });

  it('should pass through ZodNativeEnum', () => {
    enum Color {
      Red = 'RED',
      Green = 'GREEN',
    }
    const schema = z.object({ val: z.nativeEnum(Color) });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({ val: 'RED' }).success).toBe(true);
    expect(coerced.safeParse({ val: 'BLUE' }).success).toBe(false);
  });

  it('should preserve catch function behavior', () => {
    const schema = z.object({
      val: z.number().catch((ctx) => (ctx.input as unknown as string).length),
    });
    const coerced = makeCoercedSchema(schema);
    const result = coerced.safeParse({ val: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      // zod 3 hands the catch handler the raw input ('hello' -> length 5);
      // zod 4 hands it the failed post-coercion value (NaN -> no length).
      expect(result.data.val).toBe(isZodV4Schema(schema) ? undefined : 5);
    }
  });

  it('should handle default with function value', () => {
    const schema = z.object({ val: z.number().default(() => 42) as z.ZodDefault<z.ZodNumber> });
    const coerced = makeCoercedSchema(schema);
    expect(coerced.safeParse({}).success).toBe(true);
    expect(coerced.safeParse({ val: '99' }).success).toBe(true);
  });

  it('should pass through unknown schema types', () => {
    const unknownSchema = { _def: { typeName: 'CustomType' } } as unknown as z.ZodType;
    const coerced = makeCoercedSchema(unknownSchema);
    expect(coerced).toBe(unknownSchema);
  });
});
