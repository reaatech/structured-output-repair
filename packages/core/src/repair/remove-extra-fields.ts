import { z } from 'zod';
import { zodDef } from '../utils/zod-internals.js';

/**
 * Recursively removes fields from data that are not defined in the schema.
 * This is useful when a strict Zod schema rejects extra fields that the LLM hallucinated.
 */
export function removeExtraFields(schema: z.ZodType, data: unknown): unknown {
  // Primitives and pass-through types
  if (
    schema instanceof z.ZodString ||
    schema instanceof z.ZodNumber ||
    schema instanceof z.ZodBoolean ||
    schema instanceof z.ZodBigInt ||
    schema instanceof z.ZodDate ||
    schema instanceof z.ZodLiteral ||
    schema instanceof z.ZodEnum ||
    schema instanceof z.ZodAny ||
    schema instanceof z.ZodUnknown ||
    schema instanceof z.ZodNull ||
    schema instanceof z.ZodUndefined ||
    schema instanceof z.ZodVoid
  ) {
    return data;
  }

  // Wrappers
  if (schema instanceof z.ZodOptional) {
    if (data === undefined) return undefined;
    return removeExtraFields(schema.unwrap() as z.ZodType, data);
  }
  if (schema instanceof z.ZodNullable) {
    if (data === null) return null;
    return removeExtraFields(schema.unwrap() as z.ZodType, data);
  }
  if (schema instanceof z.ZodDefault) {
    return removeExtraFields(schema.unwrap() as z.ZodType, data);
  }
  if (schema instanceof z.ZodCatch) {
    return removeExtraFields(schema.unwrap() as z.ZodType, data);
  }
  if (
    schema instanceof z.ZodPipe ||
    schema instanceof z.ZodTransform ||
    schema instanceof z.ZodPreprocess
  ) {
    return data;
  }
  if (schema instanceof z.ZodLazy) {
    const getter = zodDef<{ getter: () => z.ZodType }>(schema).getter;
    return removeExtraFields(getter(), data);
  }
  if (schema instanceof z.ZodPromise) {
    return data;
  }

  // Collections
  if (schema instanceof z.ZodObject) {
    if (typeof data !== 'object' || data === null) return data;
    const def = zodDef<{ catchall?: z.ZodType }>(schema);
    if (def.catchall) {
      const catchallDef = zodDef<{ type: string }>(def.catchall);
      if (catchallDef.type === 'unknown') return data;
    }
    const shape = schema.shape as Record<string, z.ZodType>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key in shape) {
        const fieldSchema = shape[key];
        result[key] = removeExtraFields(fieldSchema, value);
      }
    }
    return result;
  }
  if (schema instanceof z.ZodArray) {
    if (!Array.isArray(data)) return data;
    return data.map((item) => removeExtraFields(schema.element as z.ZodType, item));
  }
  if (schema instanceof z.ZodRecord) {
    if (typeof data !== 'object' || data === null) return data;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = removeExtraFields((schema as z.ZodRecord).valueType as z.ZodType, value);
    }
    return result;
  }
  if (schema instanceof z.ZodMap) {
    if (!(data instanceof Map)) return data;
    const result = new Map();
    for (const [key, value] of data.entries()) {
      result.set(key, removeExtraFields((schema as z.ZodMap).valueType as z.ZodType, value));
    }
    return result;
  }
  if (schema instanceof z.ZodSet) {
    if (!(data instanceof Set)) return data;
    const result = new Set();
    const setDef = zodDef<{ valueType: z.ZodType }>(schema);
    for (const item of data) {
      result.add(removeExtraFields(setDef.valueType, item));
    }
    return result;
  }
  if (schema instanceof z.ZodTuple) {
    if (!Array.isArray(data)) return data;
    const tupleDef = zodDef<{ items: readonly z.ZodType[]; rest: z.ZodType | null }>(schema);
    const result: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < tupleDef.items.length) {
        const itemSchema = tupleDef.items[i];
        result.push(removeExtraFields(itemSchema, data[i]));
      } else if (tupleDef.rest) {
        result.push(removeExtraFields(tupleDef.rest, data[i]));
      } else {
        result.push(data[i]);
      }
    }
    return result;
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema as z.ZodUnion).options;
    for (const option of options) {
      try {
        const stripped = removeExtraFields(option as z.ZodType, data);
        const result = (option as z.ZodType).safeParse(stripped);
        if (result.success) {
          return stripped;
        }
      } catch {}
    }
    return data;
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = (schema as z.ZodDiscriminatedUnion).options;
    for (const option of options) {
      try {
        const stripped = removeExtraFields(option as z.ZodType, data);
        const result = (option as z.ZodType).safeParse(stripped);
        if (result.success) {
          return stripped;
        }
      } catch {}
    }
    return data;
  }
  if (schema instanceof z.ZodIntersection) {
    const def = zodDef<{ left: z.ZodType; right: z.ZodType }>(schema);
    const { left, right } = def;
    if (left instanceof z.ZodObject && right instanceof z.ZodObject) {
      const merged = z.object({ ...left.shape, ...right.shape });
      return removeExtraFields(merged, data);
    }
    return data;
  }

  return data;
}
