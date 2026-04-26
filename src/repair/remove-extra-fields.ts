import { z } from 'zod';

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
    // Can't inspect through effects; return data as-is
    return data;
  }
  if (schema instanceof z.ZodLazy) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return removeExtraFields((schema as any).schema, data);
  }
  if (schema instanceof z.ZodPromise) {
    return data;
  }

  // Collections
  if (schema instanceof z.ZodObject) {
    if (typeof data !== 'object' || data === null) return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownKeys = (schema as any)._def.unknownKeys as 'strict' | 'strip' | 'passthrough';
    if (unknownKeys === 'passthrough') return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any).shape as Record<string, z.ZodType>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key in shape) {
        result[key] = removeExtraFields(shape[key]!, value);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (schema as any)._def.items as z.ZodType[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rest = (schema as any)._def.rest as z.ZodType | null;
    const result: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < items.length) {
        result.push(removeExtraFields(items[i]!, data[i]));
      } else if (rest) {
        result.push(removeExtraFields(rest, data[i]));
      } else {
        result.push(data[i]);
      }
    }
    return result;
  }
  if (schema instanceof z.ZodUnion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (schema as any)._def.options as z.ZodType[];
    for (const option of options) {
      try {
        const stripped = removeExtraFields(option, data);
        // Validate to see if this branch matches
        const result = option.safeParse(stripped);
        if (result.success) {
          return stripped;
        }
      } catch {
        continue;
      }
    }
    return data;
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (schema as any)._def.options as z.ZodType[];
    for (const option of options) {
      try {
        const stripped = removeExtraFields(option, data);
        const result = option.safeParse(stripped);
        if (result.success) {
          return stripped;
        }
      } catch {
        continue;
      }
    }
    return data;
  }
  if (schema instanceof z.ZodIntersection) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const left = (schema as any)._def.left as z.ZodType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const right = (schema as any)._def.right as z.ZodType;
    // For object intersections, merge shapes and strip
    if (left instanceof z.ZodObject && right instanceof z.ZodObject) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leftShape = (left as any).shape as Record<string, z.ZodType>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rightShape = (right as any).shape as Record<string, z.ZodType>;
      const merged = z.object({ ...leftShape, ...rightShape });
      return removeExtraFields(merged, data);
    }
    return data;
  }

  return data;
}
