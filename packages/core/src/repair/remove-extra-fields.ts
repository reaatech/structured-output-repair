import { z } from 'zod';
import {
  getArrayElement,
  getInnerType,
  getIntersectionSides,
  getLazyGetter,
  getMapKeyValue,
  getObjectShape,
  getRecordKeyValue,
  getSetValueType,
  getTupleItems,
  getUnionOptions,
  getUnknownKeysMode,
  zodKind,
} from '../utils/zod-internals.js';

/** Kinds that never have fields to strip: primitives, literals, enums, pass-throughs. */
const LEAF_KINDS: ReadonlySet<string> = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'date',
  'literal',
  'enum',
  'nativeEnum',
  'any',
  'unknown',
  'null',
  'undefined',
  'void',
]);

/**
 * Recursively removes fields from data that are not defined in the schema.
 * This is useful when a strict Zod schema rejects extra fields that the LLM hallucinated.
 *
 * Works with both zod 3 and zod 4 schema objects.
 */
export function removeExtraFields(schema: z.ZodType, data: unknown): unknown {
  const kind = zodKind(schema);

  // Primitives and pass-through types
  if (LEAF_KINDS.has(kind)) {
    return data;
  }

  // Wrappers
  if (kind === 'optional') {
    if (data === undefined) return undefined;
    return removeExtraFields(getInnerType(schema), data);
  }
  if (kind === 'nullable') {
    if (data === null) return null;
    return removeExtraFields(getInnerType(schema), data);
  }
  if (kind === 'default') {
    return removeExtraFields(getInnerType(schema), data);
  }
  if (kind === 'catch') {
    return removeExtraFields(getInnerType(schema), data);
  }
  if (kind === 'effects') {
    return data;
  }
  if (kind === 'lazy') {
    return removeExtraFields(getLazyGetter(schema)(), data);
  }
  if (kind === 'promise') {
    return data;
  }

  // Collections
  if (kind === 'object') {
    if (typeof data !== 'object' || data === null) return data;
    if (getUnknownKeysMode(schema) === 'passthrough') return data;
    const shape = getObjectShape(schema);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key in shape) {
        const fieldSchema = shape[key];
        result[key] = removeExtraFields(fieldSchema, value);
      }
    }
    return result;
  }
  if (kind === 'array') {
    if (!Array.isArray(data)) return data;
    const element = getArrayElement(schema);
    return data.map((item) => removeExtraFields(element, item));
  }
  if (kind === 'record') {
    if (typeof data !== 'object' || data === null) return data;
    const { valueType } = getRecordKeyValue(schema);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = removeExtraFields(valueType, value);
    }
    return result;
  }
  if (kind === 'map') {
    if (!(data instanceof Map)) return data;
    const { valueType } = getMapKeyValue(schema);
    const result = new Map();
    for (const [key, value] of data.entries()) {
      result.set(key, removeExtraFields(valueType, value));
    }
    return result;
  }
  if (kind === 'set') {
    if (!(data instanceof Set)) return data;
    const valueType = getSetValueType(schema);
    const result = new Set();
    for (const item of data) {
      result.add(removeExtraFields(valueType, item));
    }
    return result;
  }
  if (kind === 'tuple') {
    if (!Array.isArray(data)) return data;
    const { items, rest } = getTupleItems(schema);
    const result: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < items.length) {
        const itemSchema = items[i];
        result.push(removeExtraFields(itemSchema, data[i]));
      } else if (rest) {
        result.push(removeExtraFields(rest, data[i]));
      } else {
        result.push(data[i]);
      }
    }
    return result;
  }
  if (kind === 'union' || kind === 'discriminatedUnion') {
    const options = getUnionOptions(schema);
    for (const option of options) {
      try {
        const stripped = removeExtraFields(option, data);
        const result = option.safeParse(stripped);
        if (result.success) {
          return stripped;
        }
      } catch {}
    }
    return data;
  }
  if (kind === 'intersection') {
    const { left, right } = getIntersectionSides(schema);
    if (zodKind(left) === 'object' && zodKind(right) === 'object') {
      const leftShape = getObjectShape(left);
      const rightShape = getObjectShape(right);
      const merged = z.object({ ...leftShape, ...rightShape });
      return removeExtraFields(merged, data);
    }
    return data;
  }

  return data;
}
