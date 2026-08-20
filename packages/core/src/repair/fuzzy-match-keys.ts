import type { z } from 'zod';
import {
  getArrayElement,
  getInnerType,
  getLazyGetter,
  getObjectShape,
  getRecordKeyValue,
  getUnionOptions,
  zodKind,
} from '../utils/zod-internals.js';

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
 *
 * Works with both zod 3 and zod 4 schema objects.
 */
export function fuzzyMatchKeys(schema: z.ZodType, data: unknown): unknown {
  const kind = zodKind(schema);

  // Unwrap wrappers, recursing into the inner type.
  if (kind === 'optional') {
    if (data === undefined) return data;
    return fuzzyMatchKeys(getInnerType(schema), data);
  }
  if (kind === 'nullable') {
    if (data === null) return data;
    return fuzzyMatchKeys(getInnerType(schema), data);
  }
  if (kind === 'default') {
    return fuzzyMatchKeys(getInnerType(schema), data);
  }
  if (kind === 'catch') {
    return fuzzyMatchKeys(getInnerType(schema), data);
  }
  if (kind === 'lazy') {
    return fuzzyMatchKeys(getLazyGetter(schema)(), data);
  }

  if (kind === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;

    const shape = getObjectShape(schema);
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

  if (kind === 'array') {
    if (!Array.isArray(data)) return data;
    const element = getArrayElement(schema);
    return data.map((item) => fuzzyMatchKeys(element, item));
  }

  if (kind === 'record') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return data;
    const { valueType } = getRecordKeyValue(schema);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = fuzzyMatchKeys(valueType, value);
    }
    return result;
  }

  if (kind === 'union' || kind === 'discriminatedUnion') {
    const options = getUnionOptions(schema);
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
