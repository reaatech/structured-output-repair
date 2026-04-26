import { z } from 'zod';
import { SchemaMismatchError } from '../utils/errors.js';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return z.literal((schema as any)._def.value);
  }
  if (schema instanceof z.ZodEnum) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return z.enum((schema as any)._def.values);
  }
  if (schema instanceof z.ZodNativeEnum) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return z.nativeEnum((schema as any)._def.values);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (schema as any)._def.defaultValue;
    const defaultValue = typeof raw === 'function' ? raw() : raw;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (inner as any).default(defaultValue);
  }
  if (schema instanceof z.ZodCatch) {
    const inner = makeCoercedSchema(schema.removeCatch());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catchFn = (schema as any)._def.catchValue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (inner as any).catch(catchFn);
  }
  if (schema instanceof z.ZodEffects) {
    // Can't safely coerce through effects; return original
    return schema;
  }
  if (schema instanceof z.ZodLazy) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return z.lazy(() => makeCoercedSchema((schema as any).schema));
  }
  if (schema instanceof z.ZodPromise) {
    return z.promise(makeCoercedSchema(schema.unwrap()));
  }

  // Collections
  if (schema instanceof z.ZodObject) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any).shape as Record<string, z.ZodType>;
    const newShape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(shape)) {
      newShape[key] = makeCoercedSchema(value);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownKeys = (schema as any)._def.unknownKeys as 'strict' | 'strip' | 'passthrough';
    const obj = z.object(newShape);
    if (unknownKeys === 'strict') return obj.strict();
    if (unknownKeys === 'passthrough') return obj.passthrough();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (schema as any)._def.items as z.ZodType[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rest = (schema as any)._def.rest as z.ZodType | null;
    const coercedItems = items.map(makeCoercedSchema);
    if (rest) {
      return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]).rest(makeCoercedSchema(rest));
    }
    return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodUnion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (schema as any)._def.options as z.ZodType[];
    return z.union(options.map(makeCoercedSchema) as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = (schema as any)._def.options as z.ZodType[];
    const coercedOptions = options.map(makeCoercedSchema);
    if (coercedOptions.length === 1) return coercedOptions[0]!;
    return z.union(coercedOptions as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodIntersection) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const left = (schema as any)._def.left as z.ZodType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const right = (schema as any)._def.right as z.ZodType;
    return z.intersection(makeCoercedSchema(left), makeCoercedSchema(right));
  }

  // Fallback: return original schema
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
