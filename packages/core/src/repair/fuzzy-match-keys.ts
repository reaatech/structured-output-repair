import { z } from 'zod';
import { zodDef } from '../utils/zod-internals.js';

/**
 * Normalizes a key for fuzzy comparison: lowercased with all non-alphanumeric
 * characters removed. This makes `firstName`, `first_name`, `first-name`, and
 * `First Name` all compare equal.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Recursively renames object keys in `data` to the closest matching key
 * defined in the schema, fixing casing/separator differences that LLMs
 * commonly introduce (e.g. `e-mail` -> `email`, `first_name` -> `firstName`).
 *
 * Only keys that are unambiguously close to exactly one schema key are
 * renamed, and an exact match always wins. Keys with no close schema match
 * are left untouched (a later `remove-extra-fields` pass can drop them).
 */
export function fuzzyMatchKeys(schema: z.ZodType, data: unknown): unknown {
  // Unwrap wrappers, recursing into the inner type.
  if (schema instanceof z.ZodOptional) {
    if (data === undefined) return data;
    return fuzzyMatchKeys(schema.unwrap(), data);
  }
  if (schema instanceof z.ZodNullable) {
    if (data === null) return data;
    return fuzzyMatchKeys(schema.unwrap(), data);
  }
  if (schema instanceof z.ZodDefault) {
    return fuzzyMatchKeys(schema.removeDefault(), data);
  }
  if (schema instanceof z.ZodCatch) {
    return fuzzyMatchKeys(schema.removeCatch(), data);
  }
  if (schema instanceof z.ZodLazy) {
    const getter = zodDef<{ getter: () => z.ZodType }>(schema).getter;
    return fuzzyMatchKeys(getter(), data);
  }

  if (schema instanceof z.ZodObject) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;

    const shape = zodDef<{ shape: () => Record<string, z.ZodType> }>(schema).shape();
    const shapeKeys = Object.keys(shape);

    // Build a normalized -> canonical map, skipping ambiguous collisions.
    const normalizedToCanonical = new Map<string, string | null>();
    for (const key of shapeKeys) {
      const norm = normalizeKey(key);
      normalizedToCanonical.set(norm, normalizedToCanonical.has(norm) ? null : key);
    }

    const source = data as Record<string, unknown>;
    const sourceKeys = new Set(Object.keys(source));
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
      let targetKey = key;
      if (!(key in shape)) {
        const canonical = normalizedToCanonical.get(normalizeKey(key));
        // Rename only when there is a single unambiguous target that the data
        // does not already contain verbatim.
        if (canonical && canonical !== key && !sourceKeys.has(canonical)) {
          targetKey = canonical;
        }
      }
      // Recurse into the value when the (possibly renamed) key is in the schema.
      result[targetKey] = targetKey in shape ? fuzzyMatchKeys(shape[targetKey], value) : value;
    }

    return result;
  }

  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(data)) return data;
    return data.map((item) => fuzzyMatchKeys(schema.element, item));
  }

  if (schema instanceof z.ZodRecord) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = fuzzyMatchKeys(schema.valueSchema, value);
    }
    return result;
  }

  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    const options = zodDef<{ options: z.ZodType[] }>(schema).options;
    for (const option of options) {
      try {
        const matched = fuzzyMatchKeys(option, data);
        if (option.safeParse(matched).success) return matched;
      } catch {}
    }
    return data;
  }

  return data;
}
