import { z } from 'zod';
import { SchemaMismatchError } from '../utils/errors.js';
import { zodDef } from '../utils/zod-internals.js';

/**
 * Creates a coerced version of a Zod schema.
 * Supported types: ZodString, ZodNumber, ZodBoolean, ZodBigInt, ZodDate,
 * ZodOptional, ZodNullable, ZodDefault, ZodObject, ZodArray, ZodUnion,
 * ZodLiteral, ZodEnum, ZodRecord, ZodTuple, ZodAny, ZodUnknown, ZodNull, ZodUndefined.
 */
export function makeCoercedSchema(schema: z.ZodType): z.ZodType {
  // Primitives
  if (schema instanceof z.ZodString) return z.coerce.string();
  if (schema instanceof z.ZodNumber) return z.coerce.number();
  if (schema instanceof z.ZodBoolean) return z.coerce.boolean();
  if (schema instanceof z.ZodBigInt) return z.coerce.bigint();
  if (schema instanceof z.ZodDate) return z.coerce.date();

  // Pass-through types
  if (schema instanceof z.ZodAny) return z.any();
  if (schema instanceof z.ZodUnknown) return z.unknown();
  if (schema instanceof z.ZodNull) return z.null();
  if (schema instanceof z.ZodUndefined) return z.undefined();
  if (schema instanceof z.ZodVoid) return z.void();
  if (schema instanceof z.ZodLiteral) {
    return z.literal(zodDef<{ value: z.Primitive }>(schema).value);
  }
  if (schema instanceof z.ZodEnum) {
    return z.enum(zodDef<{ values: readonly [string, ...string[]] }>(schema).values);
  }
  if (schema instanceof z.ZodNativeEnum) {
    const values = zodDef<{
      values: { [k: string]: string | number; [nu: number]: string };
    }>(schema).values;
    return z.nativeEnum(values);
  }

  // Wrappers
  if (schema instanceof z.ZodOptional) {
    return makeCoercedSchema(schema.unwrap()).optional();
  }
  if (schema instanceof z.ZodNullable) {
    return makeCoercedSchema(schema.unwrap()).nullable();
  }
  if (schema instanceof z.ZodDefault) {
    const inner = makeCoercedSchema(schema.removeDefault());
    const raw = zodDef<{ defaultValue: unknown }>(schema).defaultValue;
    const defaultValue = typeof raw === 'function' ? (raw as () => unknown)() : raw;
    return inner.default(defaultValue);
  }
  if (schema instanceof z.ZodCatch) {
    const inner = makeCoercedSchema(schema.removeCatch());
    const catchFn = zodDef<{
      catchValue: (input: unknown) => unknown;
    }>(schema).catchValue;
    return inner.catch(catchFn);
  }
  if (schema instanceof z.ZodEffects) {
    return schema;
  }
  if (schema instanceof z.ZodLazy) {
    const getter = zodDef<{ getter: () => z.ZodType }>(schema).getter;
    return z.lazy(() => makeCoercedSchema(getter()));
  }
  if (schema instanceof z.ZodPromise) {
    return z.promise(makeCoercedSchema(schema.unwrap()));
  }

  // Collections
  if (schema instanceof z.ZodObject) {
    const def = zodDef<{
      shape: () => Record<string, z.ZodType>;
      unknownKeys: string;
    }>(schema);
    const rawShape = def.shape();
    const newShape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(rawShape)) {
      newShape[key] = makeCoercedSchema(value);
    }
    const obj = z.object(newShape);
    if (def.unknownKeys === 'strict') return obj.strict();
    if (def.unknownKeys === 'passthrough') return obj.passthrough();
    return obj;
  }
  if (schema instanceof z.ZodArray) {
    return z.array(makeCoercedSchema(schema.element));
  }
  if (schema instanceof z.ZodRecord) {
    return z.record(makeCoercedSchema(schema.valueSchema));
  }
  if (schema instanceof z.ZodMap) {
    return z.map(makeCoercedSchema(schema.keySchema), makeCoercedSchema(schema.valueSchema));
  }
  if (schema instanceof z.ZodSet) {
    return z.set(makeCoercedSchema(schema._def.valueType));
  }
  if (schema instanceof z.ZodTuple) {
    const def = zodDef<{ items: z.ZodType[]; rest: z.ZodType | null }>(schema);
    const coercedItems = def.items.map(makeCoercedSchema);
    if (def.rest) {
      return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]).rest(makeCoercedSchema(def.rest));
    }
    return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodUnion) {
    const options = zodDef<{ options: z.ZodType[] }>(schema).options;
    return z.union(options.map(makeCoercedSchema) as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = zodDef<{ options: z.ZodType[] }>(schema).options;
    const coercedOptions = options.map(makeCoercedSchema);
    if (coercedOptions.length === 1) return coercedOptions[0];
    return z.union(coercedOptions as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodIntersection) {
    const { left, right } = zodDef<{ left: z.ZodType; right: z.ZodType }>(schema);
    return z.intersection(makeCoercedSchema(left), makeCoercedSchema(right));
  }

  return schema;
}

/**
 * Attempts to coerce data to match the schema by rebuilding the schema
 * with Zod's built-in coercion and re-parsing.
 */
export function coerceTypes<T extends z.ZodType>(schema: T, data: unknown): unknown {
  const coercedSchema = makeCoercedSchema(schema);
  const result = coercedSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  throw new SchemaMismatchError('Type coercion failed', result.error);
}
