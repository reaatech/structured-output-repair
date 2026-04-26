import { z } from 'zod';

/**
 * Converts a JSON Schema object to a Zod schema.
 * Supports: string, number, integer, boolean, null, object, array, enum.
 */
export function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType {
  if (!schema || typeof schema !== 'object') {
    return z.unknown();
  }

  const {
    type,
    properties,
    items,
    required,
    enum: enumValues,
    minimum,
    maximum,
    minLength,
    maxLength,
    pattern,
  } = schema as {
    type?: string;
    properties?: Record<string, Record<string, unknown>>;
    items?: Record<string, unknown>;
    required?: string[];
    enum?: unknown[];
    description?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };

  // Handle enum
  if (enumValues && Array.isArray(enumValues) && enumValues.length > 0) {
    const stringEnums = enumValues.filter((v): v is string => typeof v === 'string');
    if (stringEnums.length === enumValues.length) {
      return z.enum(stringEnums as [string, ...string[]]);
    }
    const literals = enumValues.map((v) => z.literal(v as string | number | boolean));
    if (literals.length === 1) return literals[0]!;
    return z.union(literals as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }

  // Handle object type
  if (type === 'object' && properties) {
    const shape: Record<string, z.ZodType> = {};

    for (const [key, value] of Object.entries(properties)) {
      const isRequired = required?.includes(key) ?? false;
      let fieldSchema = jsonSchemaToZod(value);

      if (!isRequired) {
        fieldSchema = fieldSchema.optional();
      }

      shape[key] = fieldSchema;
    }

    return z.object(shape);
  }

  // Handle array type
  if (type === 'array' && items) {
    return z.array(jsonSchemaToZod(items));
  }

  // Handle primitive types
  switch (type) {
    case 'string': {
      let s = z.string();
      if (minLength !== undefined) s = s.min(minLength);
      if (maxLength !== undefined) s = s.max(maxLength);
      if (pattern) s = s.regex(new RegExp(pattern));
      return s;
    }
    case 'number': {
      let n = z.number();
      if (minimum !== undefined) n = n.min(minimum);
      if (maximum !== undefined) n = n.max(maximum);
      return n;
    }
    case 'integer': {
      let n = z.number().int();
      if (minimum !== undefined) n = n.min(minimum);
      if (maximum !== undefined) n = n.max(maximum);
      return n;
    }
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    default:
      return z.unknown();
  }
}
