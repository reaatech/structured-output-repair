import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fuzzyMatchKeys } from './fuzzy-match-keys.js';

describe('fuzzyMatchKeys', () => {
  it('renames keys differing only by separators', () => {
    const schema = z.object({ email: z.string(), firstName: z.string() });
    const result = fuzzyMatchKeys(schema, { 'e-mail': 'a@b.com', first_name: 'Al' });
    expect(result).toEqual({ email: 'a@b.com', firstName: 'Al' });
  });

  it('renames keys differing only by case', () => {
    const schema = z.object({ userId: z.number() });
    expect(fuzzyMatchKeys(schema, { UserID: 5 })).toEqual({ userId: 5 });
  });

  it('prefers an exact match over a fuzzy one', () => {
    const schema = z.object({ firstName: z.string() });
    const result = fuzzyMatchKeys(schema, { firstName: 'keep', first_name: 'drop' });
    expect(result).toEqual({ firstName: 'keep', first_name: 'drop' });
  });

  it('leaves keys with no close schema match untouched', () => {
    const schema = z.object({ name: z.string() });
    expect(fuzzyMatchKeys(schema, { name: 'x', extra: 1 })).toEqual({ name: 'x', extra: 1 });
  });

  it('recurses into nested objects', () => {
    const schema = z.object({ user: z.object({ fullName: z.string() }) });
    const result = fuzzyMatchKeys(schema, { user: { full_name: 'Al' } });
    expect(result).toEqual({ user: { fullName: 'Al' } });
  });

  it('recurses into arrays of objects', () => {
    const schema = z.object({ items: z.array(z.object({ itemId: z.number() })) });
    const result = fuzzyMatchKeys(schema, { items: [{ item_id: 1 }, { 'item-id': 2 }] });
    expect(result).toEqual({ items: [{ itemId: 1 }, { itemId: 2 }] });
  });

  it('unwraps optional and nullable schemas', () => {
    const schema = z.object({ phoneNumber: z.string() }).optional();
    expect(fuzzyMatchKeys(schema, { phone_number: '123' })).toEqual({ phoneNumber: '123' });
  });

  it('makes an otherwise-failing payload validate after remapping', () => {
    const schema = z.object({ firstName: z.string(), lastName: z.string() });
    const remapped = fuzzyMatchKeys(schema, { first_name: 'Ada', last_name: 'Lovelace' });
    expect(schema.safeParse(remapped).success).toBe(true);
  });
});
