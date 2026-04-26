# Skill: Implementation

**Category**: Core Development  
**Difficulty**: Advanced  
**Estimated Time**: 2-4 hours per repair strategy

## Overview

This skill covers the implementation of core library functionality, including repair strategies, the repair pipeline orchestrator, and the public API.

## Capabilities

An AI agent with this skill can:

1. **Implement Repair Strategies**
   - `strip-fences.ts` - Remove markdown code fence wrappers
   - `fix-json.ts` - Repair JSON syntax errors (trailing commas, missing braces, etc.)
   - `coerce-types.ts` - Use Zod coercion for type mismatches
   - `remove-extra-fields.ts` - Strip hallucinated fields not in schema

2. **Build Repair Pipeline**
   - Create graduated repair orchestrator
   - Implement strategy chaining with fallback
   - Track repair steps and errors
   - Handle success/failure states

3. **Develop Public API**
   - `repair()` - Quick repair function
   - `repairOutput()` - Full options repair
   - `isValid()` - Validation check
   - `analyzeInput()` - Input analysis without repair

4. **Error Handling**
   - Custom error classes (UnrepairableError, SchemaMismatchError, etc.)
   - Contextual error information
   - Graceful degradation

5. **Type Safety**
   - Full TypeScript generics for schema inference
   - Strict type checking throughout
   - No `any` types in public API

## When to Use This Skill

- Implementing new repair strategies
- Building the core repair pipeline
- Adding new public API methods
- Refactoring existing repair logic
- Optimizing repair performance

## Example Requests

```
"Implement the strip-fences repair strategy following DEV_PLAN.md specs"

"Create the repair pipeline orchestrator with graduated strategies"

"Add type coercion using Zod's built-in coerce feature"

"Implement the remove-extra-fields strategy for nested objects"

"Create the public repair() API with full type inference"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Strategy implementation following DEV_PLAN.md specifications
- [ ] Full TypeScript types with strict mode
- [ ] JSDoc comments on all public APIs
- [ ] Unit tests for implemented functionality
- [ ] Error handling for edge cases
- [ ] Performance considerations documented

## Dependencies

This skill requires:
- Setup skill completed (project structure in place)
- Understanding of Zod schema validation
- Knowledge of JSON syntax and parsing
- Familiarity with TypeScript generics
- Access to DEV_PLAN.md for specifications

## Technical Specifications

### Repair Strategy Interface

```typescript
export type RepairHandler = (input: string, schema?: z.ZodType) => string | unknown;

export interface RepairStrategyConfig {
  name: string;
  handler: RepairHandler;
  description: string;
  canRecover: (error: Error) => boolean;
}
```

### Pipeline Flow

1. **Input Validation** - Check if input is valid JSON
2. **Strip Fences** - Remove markdown wrappers
3. **Fix JSON Syntax** - Repair common JSON errors
4. **Parse JSON** - Convert string to object
5. **Coerce Types** - Apply Zod coercion
6. **Remove Extra Fields** - Clean hallucinated fields
7. **Validate Schema** - Final validation against schema
8. **Relax Schema** - Last resort attempt

### Error Recovery

Each strategy should:
- Accept input string
- Return repaired string or parsed object
- Throw specific error types on failure
- Be idempotent (safe to run multiple times)

## Best Practices

1. **Single Responsibility** - Each strategy does one thing well
2. **Fail Fast** - Validate early, fail with clear errors
3. **Preserve Data** - Never lose information during repair
4. **Document Patterns** - Comment what patterns each strategy handles
5. **Test Edge Cases** - Test with malformed, nested, and complex inputs
6. **Performance First** - Optimize for common cases
7. **Type Safety** - Use TypeScript to prevent runtime errors

## Common Patterns Handled

### strip-fences
```typescript
// Input patterns
'```json\n{ ... }\n```'
'```JSON\n{ ... }\n```'
'```javascript\n{ ... }\n```'
'````json\n```json\n{ ... }\n```\n````'
```

### fix-json
```typescript
// Trailing commas
'{ "a": 1, }' → '{ "a": 1 }'

// Missing closing braces
'{ "a": 1' → '{ "a": 1 }'

// Unquoted keys
'{ a: 1 }' → '{ "a": 1 }'

// Single quotes
"{ 'a': 1 }" → '{ "a": 1 }'

// Missing commas
'{ "a": 1 "b": 2 }' → '{ "a": 1, "b": 2 }'

// Invalid values
'{ "a": NaN }' → '{ "a": null }'
```

### coerce-types
Note: Zod does not provide a built-in way to programmatically coerce an arbitrary schema. Implementing this requires walking the Zod schema tree and rebuilding it with coerced variants (`z.coerce.number()`, `z.coerce.boolean()`, etc.) while preserving structure and optionality.

```typescript
// String to number
schema: z.object({ age: z.number() })
input: { age: "30" } → { age: 30 }

// String to boolean
schema: z.object({ active: z.boolean() })
input: { active: "true" } → { active: true }

// Array wrapping
schema: z.object({ items: z.array(z.number()) })
input: { items: 1 } → { items: [1] }
```

## Testing Strategy

Each repair strategy should have tests for:

1. **Happy Path** - Common, well-formed input
2. **Edge Cases** - Unusual but valid input
3. **Malformed Input** - Broken JSON that can be fixed
4. **Unfixable Input** - Input that should fail gracefully
5. **Performance** - Large inputs, nested structures
6. **Idempotency** - Running repair multiple times

## Troubleshooting

### Common Issues

**Issue**: Strategy over-corrects and breaks valid JSON
- **Solution**: Add validation before applying repair

**Issue**: Type coercion loses precision or is hard to implement for arbitrary schemas
- **Solution**: Start with support for common Zod types (ZodNumber, ZodBoolean, ZodString, ZodArray, ZodObject, ZodOptional). Document unsupported types.

**Issue**: Extra fields removal breaks nested structures
- **Solution**: Recursively walk schema tree and only remove at leaf level

**Issue**: Performance degradation on large inputs
- **Solution**: Optimize regex patterns, avoid unnecessary string operations

## Resources

- [Zod Documentation](https://zod.dev/)
- [JSON Specification](https://www.json.org/json-en.html)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [DEV_PLAN.md](../DEV_PLAN.md) - Full implementation specifications

## Related Skills

- [`setup.md`](./setup.md) - Project initialization
- [`testing.md`](./testing.md) - Writing comprehensive tests
- [`documentation.md`](./documentation.md) - API documentation
