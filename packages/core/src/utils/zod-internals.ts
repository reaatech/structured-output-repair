import type { z } from 'zod';

/**
 * Accesses Zod's internal `_def` property without using `any`.
 *
 * Zod types do not expose `_def` in their public type declarations,
 * but it is the stable mechanism for introspecting schema structure
 * at runtime (used by coercion and extra-field removal strategies).
 *
 * The double-cast through `unknown` avoids the use of `any` while
 * still providing typed access to Zod implementation internals.
 */
export function zodDef<Def>(schema: z.ZodType): Def {
  return (schema as unknown as { _def: Def })._def;
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
