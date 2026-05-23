import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { repairOutput } from './index.js';

describe('partial data and field errors on failure', () => {
  it('returns parsed partial data when validation cannot be satisfied', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const result = repairOutput({ schema, input: '{ "name": "Al", "age": "not-a-number" }' });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.partialData).toMatchObject({ name: 'Al' });
  });

  it('reports per-field validation errors with paths', () => {
    const schema = z.object({ address: z.object({ zip: z.number() }) });
    const result = repairOutput({ schema, input: '{ "address": { "zip": {} } }' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.some((e) => e.path === 'address.zip')).toBe(true);
  });

  it('formats array indices in error paths', () => {
    const schema = z.object({ tags: z.array(z.number()) });
    const result = repairOutput({ schema, input: '{ "tags": [1, "not-a-number"] }' });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.some((e) => e.path === 'tags[1]')).toBe(true);
  });

  it('omits partialData when JSON could not be parsed at all', () => {
    const schema = z.object({ name: z.string() });
    const result = repairOutput({ schema, input: 'not json :: at all ::' });

    expect(result.success).toBe(false);
    expect(result.partialData).toBeUndefined();
    expect(result.fieldErrors).toBeUndefined();
  });
});
