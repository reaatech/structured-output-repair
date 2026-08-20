import { z } from 'zod';
import { SchemaMismatchError } from '../utils/errors.js';
import {
  getArrayElement,
  getCatchValue,
  getDefaultValue,
  getEnumValues,
  getInnerType,
  getIntersectionSides,
  getLazyGetter,
  getLiteralValues,
  getMapKeyValue,
  getNativeEnumValues,
  getObjectShape,
  getPromiseInnerType,
  getRecordKeyValue,
  getSetValueType,
  getTupleItems,
  getUnionOptions,
  getUnknownKeysMode,
  isZodV4Schema,
  zodKind,
} from '../utils/zod-internals.js';

/**
 * Creates a coerced version of a Zod schema.
 * Supported kinds: string, number, boolean, bigint, date,
 * optional, nullable, default, object, array, record, union,
 * literal, enum, tuple, any, unknown, null, undefined.
 *
 * Works with both zod 3 and zod 4 schema objects: introspection dispatches
 * on the detected Zod version, while the rebuilt schema is constructed with
 * the `zod` module resolved by the consumer (which is the same version that
 * created the input schema in any sane installation).
 */
export function makeCoercedSchema(schema: z.ZodType): z.ZodType {
  const kind = zodKind(schema);

  // Primitives
  if (kind === 'string') return z.coerce.string();
  if (kind === 'number') return z.coerce.number();
  if (kind === 'boolean') return z.coerce.boolean();
  if (kind === 'bigint') return z.coerce.bigint();
  if (kind === 'date') return z.coerce.date();

  // Pass-through types
  if (kind === 'any') return z.any();
  if (kind === 'unknown') return z.unknown();
  if (kind === 'null') return z.null();
  if (kind === 'undefined') return z.undefined();
  if (kind === 'void') return z.void();
  if (kind === 'literal') {
    const values = getLiteralValues(schema);
    if (isZodV4Schema(schema) && values.length > 1) {
      // zod 4 literals can hold several values; z.literal accepts an array there.
      return (z.literal as (value: unknown) => z.ZodType)(values);
    }
    return z.literal(values[0] as z.Primitive);
  }
  if (kind === 'enum') {
    return z.enum(getEnumValues(schema) as [string, ...string[]]);
  }
  if (kind === 'nativeEnum') {
    // zod 3 only — zod 4 has no native enum kind (z.nativeEnum maps to z.enum).
    return z.nativeEnum(getNativeEnumValues(schema));
  }

  // Wrappers
  if (kind === 'optional') {
    return makeCoercedSchema(getInnerType(schema)).optional();
  }
  if (kind === 'nullable') {
    return makeCoercedSchema(getInnerType(schema)).nullable();
  }
  if (kind === 'default') {
    const inner = makeCoercedSchema(getInnerType(schema));
    return inner.default(getDefaultValue(schema));
  }
  if (kind === 'catch') {
    const inner = makeCoercedSchema(getInnerType(schema));
    return inner.catch(getCatchValue(schema));
  }
  if (kind === 'effects') {
    return schema;
  }
  if (kind === 'lazy') {
    const getter = getLazyGetter(schema);
    return z.lazy(() => makeCoercedSchema(getter()));
  }
  if (kind === 'promise') {
    return z.promise(makeCoercedSchema(getPromiseInnerType(schema)));
  }

  // Collections
  if (kind === 'object') {
    const rawShape = getObjectShape(schema);
    const newShape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(rawShape)) {
      newShape[key] = makeCoercedSchema(value);
    }
    const obj = z.object(newShape);
    const unknownKeys = getUnknownKeysMode(schema);
    if (unknownKeys === 'strict') return obj.strict();
    if (unknownKeys === 'passthrough') return obj.passthrough();
    return obj;
  }
  if (kind === 'array') {
    return z.array(makeCoercedSchema(getArrayElement(schema)));
  }
  if (kind === 'record') {
    const { keyType, valueType } = getRecordKeyValue(schema);
    if (isZodV4Schema(schema)) {
      // zod 4 records always carry an explicit key schema; preserve it.
      return z.record(makeCoercedSchema(keyType), makeCoercedSchema(valueType));
    }
    return z.record(makeCoercedSchema(valueType));
  }
  if (kind === 'map') {
    const { keyType, valueType } = getMapKeyValue(schema);
    return z.map(makeCoercedSchema(keyType), makeCoercedSchema(valueType));
  }
  if (kind === 'set') {
    return z.set(makeCoercedSchema(getSetValueType(schema)));
  }
  if (kind === 'tuple') {
    const { items, rest } = getTupleItems(schema);
    const coercedItems = items.map(makeCoercedSchema);
    if (rest) {
      return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]).rest(makeCoercedSchema(rest));
    }
    return z.tuple(coercedItems as [z.ZodType, ...z.ZodType[]]);
  }
  if (kind === 'union') {
    const options = getUnionOptions(schema);
    return z.union(options.map(makeCoercedSchema) as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (kind === 'discriminatedUnion') {
    const coercedOptions = getUnionOptions(schema).map(makeCoercedSchema);
    if (coercedOptions.length === 1) return coercedOptions[0];
    return z.union(coercedOptions as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }
  if (kind === 'intersection') {
    const { left, right } = getIntersectionSides(schema);
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
