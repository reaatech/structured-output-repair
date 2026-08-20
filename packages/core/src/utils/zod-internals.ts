import type { z } from 'zod';

/**
 * Zod major-version detection and version-agnostic schema introspection.
 *
 * The repair engine introspects schemas via Zod internals, which changed
 * between zod 3 and zod 4:
 *
 * - zod 3 exposes `schema._def` with a `typeName` like `ZodString`, stores
 *   object shapes behind a `shape()` function, keeps literal values at
 *   `def.value` and enum values at `def.values` (array), and has a distinct
 *   `ZodNativeEnum` / `ZodEffects` / `ZodDiscriminatedUnion` class.
 * - zod 4 exposes `schema._zod.def` with a `type` string like `string`,
 *   stores object shapes as a plain `def.shape` object, keeps literal values
 *   at `def.values` (array) and enum entries at `def.entries` (record), marks
 *   strict/passthrough objects via `def.catchall`, merges discriminated
 *   unions into `type: 'union'` plus a `discriminator` key, and replaces
 *   effects with `type: 'pipe'`.
 *
 * The helpers below normalize both shapes into a single `ZodKind` plus
 * field accessors, so the repair strategies can be written once. Unknown or
 * newer kinds normalize to `'other'` and pass through untouched.
 */

/** Zod major version of a schema object, detected by the `_zod` internals bag. */
export type ZodVersion = 'v3' | 'v4';

/** Returns true when `schema` carries zod 4 internals (`_zod`). */
export function isZodV4Schema(schema: unknown): boolean {
  return typeof schema === 'object' && schema !== null && '_zod' in schema;
}

/** Detects the Zod major version a schema object was created with. */
export function zodVersion(schema: unknown): ZodVersion {
  return isZodV4Schema(schema) ? 'v4' : 'v3';
}

/**
 * Accesses Zod's internal def object without using `any`.
 *
 * Zod types do not expose `_def`/`_zod` in their public type declarations,
 * but they are the stable mechanism for introspecting schema structure at
 * runtime (used by coercion and extra-field removal strategies). This helper
 * transparently returns `schema._zod.def` for zod 4 schemas and
 * `schema._def` for zod 3 schemas.
 *
 * The double-cast through `unknown` avoids the use of `any` while
 * still providing typed access to Zod implementation internals.
 */
export function zodDef<Def>(schema: z.ZodType): Def {
  const bag = schema as unknown as { _def?: Def; _zod?: { def: Def } };
  return (isZodV4Schema(schema) ? bag._zod?.def : bag._def) as Def;
}

/**
 * Accesses Zod internal properties that are exposed as public getters
 * but not reflected in the base ZodType type. Accepts a property name
 * and returns the value cast to the expected type.
 *
 * Used only as a fallback for properties that are genuinely public
 * on the Zod class instance but inaccessible through base ZodType.
 */
export function zodProp<T>(schema: z.ZodType, prop: string): T {
  return (schema as unknown as Record<string, unknown>)[prop] as T;
}

/** Normalized schema kind, shared across zod 3 and zod 4. */
export type ZodKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'date'
  | 'any'
  | 'unknown'
  | 'null'
  | 'undefined'
  | 'void'
  | 'literal'
  | 'enum'
  | 'nativeEnum'
  | 'optional'
  | 'nullable'
  | 'default'
  | 'catch'
  | 'effects'
  | 'lazy'
  | 'promise'
  | 'object'
  | 'array'
  | 'record'
  | 'map'
  | 'set'
  | 'tuple'
  | 'union'
  | 'discriminatedUnion'
  | 'intersection'
  | 'other';

/** zod 3 `typeName` -> normalized kind. Anything unlisted becomes `'other'`. */
const V3_TYPE_NAMES: Record<string, ZodKind> = {
  ZodString: 'string',
  ZodNumber: 'number',
  ZodBoolean: 'boolean',
  ZodBigInt: 'bigint',
  ZodDate: 'date',
  ZodAny: 'any',
  ZodUnknown: 'unknown',
  ZodNull: 'null',
  ZodUndefined: 'undefined',
  ZodVoid: 'void',
  ZodLiteral: 'literal',
  ZodEnum: 'enum',
  ZodNativeEnum: 'nativeEnum',
  ZodOptional: 'optional',
  ZodNullable: 'nullable',
  ZodDefault: 'default',
  ZodCatch: 'catch',
  ZodEffects: 'effects',
  ZodLazy: 'lazy',
  ZodPromise: 'promise',
  ZodObject: 'object',
  ZodArray: 'array',
  ZodRecord: 'record',
  ZodMap: 'map',
  ZodSet: 'set',
  ZodTuple: 'tuple',
  ZodUnion: 'union',
  ZodDiscriminatedUnion: 'discriminatedUnion',
  ZodIntersection: 'intersection',
};

/** zod 4 `def.type` strings that map directly onto a normalized kind. */
const V4_TYPE_TAGS: ReadonlySet<string> = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'date',
  'any',
  'unknown',
  'null',
  'undefined',
  'void',
  'literal',
  'enum',
  'optional',
  'nullable',
  'default',
  'catch',
  'lazy',
  'promise',
  'object',
  'array',
  'record',
  'map',
  'set',
  'tuple',
  'union',
  'intersection',
]);

type RawDef = Record<string, unknown>;

/**
 * Returns the normalized kind of a schema, dispatching on zod 3 vs zod 4
 * internals. Kinds the engine does not understand (zod 3 `ZodNaN`,
 * `ZodBranded`, …; zod 4 `readonly`, `template_literal`, …) return `'other'`.
 */
export function zodKind(schema: z.ZodType): ZodKind {
  const def = zodDef<RawDef>(schema);
  if (!def) return 'other';

  if (isZodV4Schema(schema)) {
    // zod 4 attaches refinements as checks on the schema itself instead of
    // wrapping it in ZodEffects. A `custom` check (`.refine()` /
    // `.superRefine()`) makes the schema as opaque as a zod 3 effects
    // wrapper, so normalize it to the same pass-through kind.
    const checks = def.checks as Array<Record<string, unknown>> | undefined;
    if (
      Array.isArray(checks) &&
      checks.some(
        (check) =>
          ((check?._zod as RawDef | undefined)?.def as RawDef | undefined)?.check === 'custom',
      )
    ) {
      return 'effects';
    }
    const type = def.type as string;
    // zod 4 discriminated unions are plain unions carrying a discriminator.
    if (type === 'union' && 'discriminator' in def) return 'discriminatedUnion';
    // zod 4 replaces ZodEffects with pipes; both are opaque pass-throughs.
    if (type === 'pipe') return 'effects';
    return V4_TYPE_TAGS.has(type) ? (type as ZodKind) : 'other';
  }

  const typeName = def.typeName as string;
  return V3_TYPE_NAMES[typeName] ?? 'other';
}

/** Inner schema of optional / nullable / default / catch wrappers. */
export function getInnerType(schema: z.ZodType): z.ZodType {
  return zodDef<RawDef>(schema).innerType as z.ZodType;
}

/** Inner schema of a promise (zod 3 stores it as `def.type`, zod 4 as `def.innerType`). */
export function getPromiseInnerType(schema: z.ZodType): z.ZodType {
  const def = zodDef<RawDef>(schema);
  return (isZodV4Schema(schema) ? def.innerType : def.type) as z.ZodType;
}

/** Object shape (zod 3 stores a `shape()` thunk, zod 4 a plain object). */
export function getObjectShape(schema: z.ZodType): Record<string, z.ZodType> {
  const shape = zodDef<RawDef>(schema).shape;
  return (typeof shape === 'function' ? shape() : shape) as Record<string, z.ZodType>;
}

/** Extra-key policy of an object schema. */
export function getUnknownKeysMode(schema: z.ZodType): 'strict' | 'passthrough' | 'strip' {
  const def = zodDef<RawDef>(schema);
  if (!isZodV4Schema(schema)) {
    return (def.unknownKeys as 'strict' | 'passthrough' | 'strip') ?? 'strip';
  }
  // zod 4 encodes the policy as a catchall schema: never = strict, anything
  // else (loose objects use unknown) = passthrough, absent = strip.
  const catchall = def.catchall as z.ZodType | undefined;
  if (!catchall) return 'strip';
  const catchallType = zodDef<RawDef>(catchall).type as string;
  return catchallType === 'never' ? 'strict' : 'passthrough';
}

/** Element schema of an array (zod 3 stores it as `def.type`, zod 4 as `def.element`). */
export function getArrayElement(schema: z.ZodType): z.ZodType {
  const def = zodDef<RawDef>(schema);
  return (isZodV4Schema(schema) ? def.element : def.type) as z.ZodType;
}

/** Key and value schemas of a record. */
export function getRecordKeyValue(schema: z.ZodType): { keyType: z.ZodType; valueType: z.ZodType } {
  const def = zodDef<RawDef>(schema);
  return { keyType: def.keyType as z.ZodType, valueType: def.valueType as z.ZodType };
}

/** Key and value schemas of a map. */
export function getMapKeyValue(schema: z.ZodType): { keyType: z.ZodType; valueType: z.ZodType } {
  const def = zodDef<RawDef>(schema);
  return { keyType: def.keyType as z.ZodType, valueType: def.valueType as z.ZodType };
}

/** Value schema of a set. */
export function getSetValueType(schema: z.ZodType): z.ZodType {
  return zodDef<RawDef>(schema).valueType as z.ZodType;
}

/** Items and rest schema of a tuple. */
export function getTupleItems(schema: z.ZodType): { items: z.ZodType[]; rest: z.ZodType | null } {
  const def = zodDef<RawDef>(schema);
  return { items: def.items as z.ZodType[], rest: (def.rest as z.ZodType | null) ?? null };
}

/** Options of a union or discriminated union. */
export function getUnionOptions(schema: z.ZodType): z.ZodType[] {
  return zodDef<RawDef>(schema).options as z.ZodType[];
}

/** String values of an enum (zod 3 `def.values` array, zod 4 `def.entries` record). */
export function getEnumValues(schema: z.ZodType): string[] {
  const def = zodDef<RawDef>(schema);
  if (isZodV4Schema(schema)) {
    return Object.values(def.entries as Record<string, string>);
  }
  return def.values as string[];
}

/** Values of a literal, normalized to an array (zod 3 `def.value`, zod 4 `def.values`). */
export function getLiteralValues(schema: z.ZodType): unknown[] {
  const def = zodDef<RawDef>(schema);
  if (isZodV4Schema(schema)) {
    return def.values as unknown[];
  }
  return [def.value];
}

/** Underlying enum-like object of a zod 3 native enum (zod 4 has no native enums). */
export function getNativeEnumValues(schema: z.ZodType): {
  [k: string]: string | number;
  [nu: number]: string;
} {
  return zodDef<RawDef>(schema).values as { [k: string]: string | number; [nu: number]: string };
}

/**
 * Evaluated default value of a default wrapper. zod 3 stores the raw value
 * or a thunk; zod 4 exposes a getter that already evaluates thunks.
 */
export function getDefaultValue(schema: z.ZodType): unknown {
  const raw = zodDef<RawDef>(schema).defaultValue;
  return typeof raw === 'function' ? (raw as () => unknown)() : raw;
}

/** Catch handler of a catch wrapper (a `(ctx) => value` function in both versions). */
export function getCatchValue(schema: z.ZodType): (input: unknown) => unknown {
  return zodDef<RawDef>(schema).catchValue as (input: unknown) => unknown;
}

/** Getter of a lazy schema. */
export function getLazyGetter(schema: z.ZodType): () => z.ZodType {
  return zodDef<RawDef>(schema).getter as () => z.ZodType;
}

/** Left and right schemas of an intersection. */
export function getIntersectionSides(schema: z.ZodType): { left: z.ZodType; right: z.ZodType } {
  const def = zodDef<RawDef>(schema);
  return { left: def.left as z.ZodType, right: def.right as z.ZodType };
}
