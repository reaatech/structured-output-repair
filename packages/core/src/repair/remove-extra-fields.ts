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
    schema instanceof z.ZodNativeEnum ||
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
    return removeExtraFields(schema.unwrap(), data);
  }
  if (schema instanceof z.ZodNullable) {
    if (data === null) return null;
    return removeExtraFields(schema.unwrap(), data);
  }
  if (schema instanceof z.ZodDefault) {
    return removeExtraFields(schema.removeDefault(), data);
  }
  if (schema instanceof z.ZodCatch) {
    return removeExtraFields(schema.removeCatch(), data);
  }
  if (schema instanceof z.ZodEffects) {
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
    const def = zodDef<{
      unknownKeys: string;
      shape: () => Record<string, z.ZodType>;
    }>(schema);
    if (def.unknownKeys === 'passthrough') return data;
    const shape = def.shape();
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
    return data.map((item) => removeExtraFields(schema.element, item));
  }
  if (schema instanceof z.ZodRecord) {
    if (typeof data !== 'object' || data === null) return data;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = removeExtraFields(schema.valueSchema, value);
    }
    return result;
  }
  if (schema instanceof z.ZodMap) {
    if (!(data instanceof Map)) return data;
    const result = new Map();
    for (const [key, value] of data.entries()) {
      result.set(key, removeExtraFields(schema.valueSchema, value));
    }
    return result;
  }
  if (schema instanceof z.ZodSet) {
    if (!(data instanceof Set)) return data;
    const result = new Set();
    for (const item of data) {
      result.add(removeExtraFields(schema._def.valueType, item));
    }
    return result;
  }
  if (schema instanceof z.ZodTuple) {
    if (!Array.isArray(data)) return data;
    const def = zodDef<{ items: z.ZodType[]; rest: z.ZodType | null }>(schema);
    const result: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < def.items.length) {
        const itemSchema = def.items[i];
        result.push(removeExtraFields(itemSchema, data[i]));
      } else if (def.rest) {
        result.push(removeExtraFields(def.rest, data[i]));
      } else {
        result.push(data[i]);
      }
    }
    return result;
  }
  if (schema instanceof z.ZodUnion) {
    const options = zodDef<{ options: z.ZodType[] }>(schema).options;
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
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = zodDef<{ options: z.ZodType[] }>(schema).options;
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
  if (schema instanceof z.ZodIntersection) {
    const { left, right } = zodDef<{ left: z.ZodType; right: z.ZodType }>(schema);
    if (left instanceof z.ZodObject && right instanceof z.ZodObject) {
      const leftDef = zodDef<{ shape: () => Record<string, z.ZodType> }>(left);
      const rightDef = zodDef<{ shape: () => Record<string, z.ZodType> }>(right);
      const leftShape = leftDef.shape();
      const rightShape = rightDef.shape();
      const merged = z.object({ ...leftShape, ...rightShape });
      return removeExtraFields(merged, data);
    }
    return data;
  }

  return data;
}
