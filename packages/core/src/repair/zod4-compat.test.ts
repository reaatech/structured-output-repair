import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isZodV4Schema } from '../utils/zod-internals.js';
import { coerceTypes, removeExtraFields, repairOutput } from './index.js';

/**
 * Targeted coverage for schema shapes whose internals differ between
 * zod 3 and zod 4. This file runs under both vitest projects (`zod3` and
 * the `zod4`-aliased one), so every assertion here must hold on either
 * version; the `describe` block at the bottom gates genuinely v4-only
 * constructors (`z.strictObject`, multi-value literals, …) at runtime.
 */
describe('version-agnostic schema shapes', () => {
  it('repairs enum values inside nested objects', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        role: z.enum(['admin', 'editor', 'viewer']),
      }),
    });
    const result = repairOutput({
      schema,
      input: '```json\n{"user": {"name": "Ada", "role": "admin", "extra": true}}\n```',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ user: { name: 'Ada', role: 'admin' } });
  });

  it('repairs optional, nullable and default wrappers', () => {
    const schema = z.object({
      required: z.number(),
      opt: z.number().optional(),
      nul: z.number().nullable(),
      def: z.number().default(7),
    });
    const result = repairOutput({
      schema,
      input: '{"required": "1", "nul": null}',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ required: 1, nul: null, def: 7 });
  });

  it('coerces record values', () => {
    const schema = z.record(z.number());
    const result = coerceTypes(schema, { a: '1', b: '2' });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('strips extra fields in records and nested arrays', () => {
    const schema = z.object({
      scores: z.record(z.object({ value: z.number() })),
      tags: z.array(z.object({ label: z.string() })),
    });
    const cleaned = removeExtraFields(schema, {
      scores: { math: { value: 5, bogus: 1 } },
      tags: [{ label: 'x', bogus: 2 }],
      bogus: 3,
    });
    expect(cleaned).toEqual({
      scores: { math: { value: 5 } },
      tags: [{ label: 'x' }],
    });
  });

  it('repairs a union of object shapes', () => {
    const schema = z.union([
      z.object({ kind: z.literal('a'), val: z.number() }),
      z.object({ kind: z.literal('b'), str: z.string() }),
    ]);
    const result = repairOutput({ schema, input: '{"kind": "a", "val": "42", "junk": 1}' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ kind: 'a', val: 42 });
  });
});

describe('zod 4 only schema shapes', () => {
  const isV4 = isZodV4Schema(z.string());
  // v4-only constructors, typed loosely so the file still typechecks against zod 3.
  const z4 = z as unknown as {
    strictObject: (shape: Record<string, z.ZodType>) => z.ZodType;
    looseObject: (shape: Record<string, z.ZodType>) => z.ZodType;
  };

  it.skipIf(!isV4)('strictObject strips hallucinated fields', () => {
    const schema = z4.strictObject({ val: z.number() });
    const result = repairOutput({ schema, input: '{"val": "3", "extra": 1}' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ val: 3 });
  });

  it.skipIf(!isV4)('looseObject keeps unknown fields untouched', () => {
    const schema = z4.looseObject({ val: z.number() });
    const data = { val: 1, extra: 'kept' };
    expect(removeExtraFields(schema, data)).toEqual(data);
  });

  it.skipIf(!isV4)('multi-value literal survives coercion', () => {
    const schema = z.object({ val: (z.literal as (value: unknown) => z.ZodType)([1, 'one']) });
    const result = repairOutput({ schema, input: '{"val": "one"}' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ val: 'one' });
  });
});
