import { z } from 'zod';

type JsonSchema = Record<string, unknown>;

/**
 * Converts a JSON Schema object to a Zod schema.
 *
 * Supported: primitives (string/number/integer/boolean/null), `enum`, `const`,
 * objects (with `required`, `additionalProperties`), arrays and tuples,
 * `anyOf`/`oneOf` (union), `allOf` (intersection), `$ref`/`$defs`/`definitions`
 * (including recursive refs), nullable `type` arrays (e.g. `["string","null"]`),
 * string `format` (email/uri/url/uuid/date-time), and `default` values.
 */
export function jsonSchemaToZod(schema: JsonSchema): z.ZodType {
  return convert(schema, schema, new Map());
}

function convert(schema: JsonSchema, root: JsonSchema, cache: Map<string, z.ZodType>): z.ZodType {
  const base = convertInner(schema, root, cache);
  // Apply a JSON Schema `default` to any node that declares one.
  if (schema && typeof schema === 'object' && 'default' in schema) {
    try {
      return base.default((schema as { default: unknown }).default);
    } catch {
      return base;
    }
  }
  return base;
}

function convertInner(
  schema: JsonSchema,
  root: JsonSchema,
  cache: Map<string, z.ZodType>,
): z.ZodType {
  if (!schema || typeof schema !== 'object') {
    return z.unknown();
  }

  const {
    type,
    enum: enumValues,
    const: constValue,
  } = schema as {
    type?: string | string[];
    enum?: unknown[];
    const?: unknown;
  };

  // $ref — resolve against the document root, supporting recursion via z.lazy.
  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref;
    const cached = cache.get(ref);
    if (cached) return cached;
    const target = resolveRef(ref, root);
    if (!target) return z.unknown();
    const lazy = z.lazy(() => convert(target, root, cache));
    cache.set(ref, lazy);
    return lazy;
  }

  // const — a single allowed value.
  if ('const' in schema) {
    return z.literal(constValue as z.Primitive);
  }

  // enum
  if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
    const stringEnums = enumValues.filter((v): v is string => typeof v === 'string');
    if (stringEnums.length === enumValues.length) {
      return z.enum(stringEnums as [string, ...string[]]);
    }
    const literals = enumValues.map((v) => z.literal(v as z.Primitive));
    if (literals.length === 1) return literals[0];
    return z.union(literals as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }

  // anyOf / oneOf — union of subschemas.
  const unionOf = (schema.anyOf ?? schema.oneOf) as JsonSchema[] | undefined;
  if (Array.isArray(unionOf) && unionOf.length > 0) {
    const options = unionOf.map((s) => convert(s, root, cache));
    if (options.length === 1) return options[0];
    return z.union(options as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }

  // allOf — intersection of subschemas.
  const allOf = schema.allOf as JsonSchema[] | undefined;
  if (Array.isArray(allOf) && allOf.length > 0) {
    const parts = allOf.map((s) => convert(s, root, cache));
    return parts.reduce((acc, cur) => z.intersection(acc, cur));
  }

  // type as an array, e.g. ["string", "null"] — union of each variant.
  if (Array.isArray(type)) {
    const variants = type.map((t) => convert({ ...schema, type: t }, root, cache));
    if (variants.length === 1) return variants[0];
    return z.union(variants as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }

  // Objects (explicit `type: "object"` or implicit via `properties`).
  if (type === 'object' || (schema.properties && type === undefined)) {
    return convertObject(schema, root, cache);
  }

  // Arrays and tuples.
  if (type === 'array') {
    return convertArray(schema, root, cache);
  }

  switch (type) {
    case 'string':
      return convertString(schema);
    case 'number':
      return applyNumberConstraints(z.number(), schema);
    case 'integer':
      return applyNumberConstraints(z.number().int(), schema);
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    default:
      return z.unknown();
  }
}

function convertObject(
  schema: JsonSchema,
  root: JsonSchema,
  cache: Map<string, z.ZodType>,
): z.ZodType {
  const properties = schema.properties as Record<string, JsonSchema> | undefined;
  const required = schema.required as string[] | undefined;
  const additional = schema.additionalProperties;

  if (!properties) {
    // No declared properties — model as a record or empty object.
    if (additional && typeof additional === 'object') {
      return z.record(convert(additional as JsonSchema, root, cache));
    }
    if (additional === false) return z.object({}).strict();
    return z.record(z.unknown());
  }

  const shape: Record<string, z.ZodType> = {};
  for (const [key, value] of Object.entries(properties)) {
    const isRequired = required?.includes(key) ?? false;
    // A field with a `default` already tolerates absence — wrapping it in
    // `.optional()` would short-circuit the default, so leave it unwrapped.
    const hasDefault = value && typeof value === 'object' && 'default' in value;
    const fieldSchema = convert(value, root, cache);
    shape[key] = isRequired || hasDefault ? fieldSchema : fieldSchema.optional();
  }

  const obj = z.object(shape);
  if (additional === false) {
    return obj.strict();
  }
  if (additional === true) {
    return obj.passthrough();
  }
  if (additional && typeof additional === 'object') {
    return obj.catchall(convert(additional as JsonSchema, root, cache));
  }
  return obj;
}

function convertArray(
  schema: JsonSchema,
  root: JsonSchema,
  cache: Map<string, z.ZodType>,
): z.ZodType {
  const items = schema.items;
  const minItems = schema.minItems as number | undefined;
  const maxItems = schema.maxItems as number | undefined;

  // Tuple form: `items` is an array of positional schemas.
  if (Array.isArray(items)) {
    const tupleItems = items.map((s) => convert(s as JsonSchema, root, cache));
    return z.tuple(tupleItems as [z.ZodType, ...z.ZodType[]]);
  }

  const element = items ? convert(items as JsonSchema, root, cache) : z.unknown();
  let arr = z.array(element);
  if (minItems !== undefined) arr = arr.min(minItems);
  if (maxItems !== undefined) arr = arr.max(maxItems);
  return arr;
}

function convertString(schema: JsonSchema): z.ZodType {
  const { minLength, maxLength, pattern, format } = schema as {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
  };

  let s = z.string();
  if (minLength !== undefined) s = s.min(minLength);
  if (maxLength !== undefined) s = s.max(maxLength);
  if (pattern) {
    try {
      s = s.regex(new RegExp(pattern));
    } catch {
      // Ignore invalid/unsupported regex patterns rather than throwing.
    }
  }

  switch (format) {
    case 'email':
      return s.email();
    case 'uri':
    case 'url':
      return s.url();
    case 'uuid':
      return s.uuid();
    case 'date-time':
      return s.datetime({ offset: true });
    default:
      return s;
  }
}

function applyNumberConstraints(base: z.ZodNumber, schema: JsonSchema): z.ZodNumber {
  const { minimum, maximum } = schema as { minimum?: number; maximum?: number };
  let n = base;
  if (minimum !== undefined) n = n.min(minimum);
  if (maximum !== undefined) n = n.max(maximum);
  return n;
}

/** Resolves a local JSON Pointer ref (`#/$defs/Name`) against the root document. */
function resolveRef(ref: string, root: JsonSchema): JsonSchema | null {
  if (!ref.startsWith('#/')) return null;
  const segments = ref
    .slice(2)
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = root;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as object)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return current && typeof current === 'object' ? (current as JsonSchema) : null;
}
