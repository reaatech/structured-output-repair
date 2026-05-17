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
    const litDef = zodDef<{ values: readonly unknown[] }>(schema);
    return z.literal(litDef.values[0] as string | number | bigint | boolean | null | undefined);
  }
  if (schema instanceof z.ZodEnum) {
    return z.enum(schema.options as [string, ...string[]]);
  }

  // Wrappers
  if (schema instanceof z.ZodOptional) {
    return makeCoercedSchema(schema.unwrap() as z.ZodType).optional();
  }
  if (schema instanceof z.ZodNullable) {
    return makeCoercedSchema(schema.unwrap() as z.ZodType).nullable();
  }
  if (schema instanceof z.ZodDefault) {
    const inner = makeCoercedSchema(schema.unwrap() as z.ZodType);
    const raw = zodDef<{ defaultValue: unknown }>(schema).defaultValue;
    const defaultValue = typeof raw === 'function' ? (raw as () => unknown)() : raw;
    return inner.default(defaultValue as never);
  }
  if (schema instanceof z.ZodCatch) {
    const inner = makeCoercedSchema(schema.unwrap() as z.ZodType);
    const catchFn = zodDef<{
      catchValue: (input: unknown) => unknown;
    }>(schema).catchValue;
    return inner.catch(catchFn);
  }
  if (
    schema instanceof z.ZodPipe ||
    schema instanceof z.ZodTransform ||
    schema instanceof z.ZodPreprocess
  ) {
    return schema;
  }
  if (schema instanceof z.ZodLazy) {
    const getter = zodDef<{ getter: () => z.ZodType }>(schema).getter;
    return z.lazy(() => makeCoercedSchema(getter()));
  }
  if (schema instanceof z.ZodPromise) {
    return z.promise(makeCoercedSchema(schema.unwrap() as z.ZodType));
  }

  // Collections
  if (schema instanceof z.ZodObject) {
    const def = zodDef<{ catchall?: z.ZodType }>(schema);
    const newShape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(schema.shape)) {
      newShape[key] = makeCoercedSchema(value as z.ZodType);
    }
    const obj = z.object(newShape);
    if (def.catchall) {
      const catchallDef = zodDef<{ type: string }>(def.catchall);
      if (catchallDef.type === 'never') return obj.strict();
      if (catchallDef.type === 'unknown') return obj.passthrough();
    }
    return obj;
  }
  if (schema instanceof z.ZodArray) {
    return z.array(makeCoercedSchema(schema.element as z.ZodType));
  }
  if (schema instanceof z.ZodRecord) {
    return z.record(z.string(), makeCoercedSchema((schema as z.ZodRecord).valueType as z.ZodType));
  }
  if (schema instanceof z.ZodMap) {
    return z.map(
      makeCoercedSchema((schema as z.ZodMap).keyType as z.ZodType),
      makeCoercedSchema((schema as z.ZodMap).valueType as z.ZodType),
    );
  }
  if (schema instanceof z.ZodSet) {
    const setDef = zodDef<{ valueType: z.ZodType }>(schema);
    return z.set(makeCoercedSchema(setDef.valueType));
  }
  if (schema instanceof z.ZodTuple) {
    const tupleDef = zodDef<{ items: readonly z.ZodType[]; rest: z.ZodType | null }>(schema);
    const coercedItems = tupleDef.items.map(makeCoercedSchema);
    if (tupleDef.rest) {
      return z
        .tuple(coercedItems as [z.ZodType, ...z.ZodType[]])
        .rest(makeCoercedSchema(tupleDef.rest));
    }
    return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema as z.ZodUnion).options;
    return z.union(
      options.map((opt) => makeCoercedSchema(opt as z.ZodType)) as [
        z.ZodType,
        z.ZodType,
        ...z.ZodType[],
      ],
    );
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = (schema as z.ZodDiscriminatedUnion).options;
    const coercedOptions = options.map((opt) => makeCoercedSchema(opt as z.ZodType));
    if (coercedOptions.length === 1) return coercedOptions[0];
    return z.union(coercedOptions as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (schema instanceof z.ZodIntersection) {
    const def = zodDef<{ left: z.ZodType; right: z.ZodType }>(schema);
    return z.intersection(makeCoercedSchema(def.left), makeCoercedSchema(def.right));
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
