# Skill: Implementation

**Category**: Core Development
**Difficulty**: Advanced
**Estimated Time**: 2-4 hours per repair strategy

## Overview

This skill covers the implementation of core library functionality within the `@reaatech/structured-repair-core` package, including repair strategies, the repair pipeline orchestrator, and the public API.

## Capabilities

An AI agent with this skill can:

1. **Implement Repair Strategies** (`packages/core/src/repair/`)
   - `strip-fences.ts` — Remove markdown code fence wrappers
   - `fix-json.ts` — Repair JSON syntax errors (trailing commas, missing braces, etc.)
   - `coerce-types.ts` — Use Zod coercion for type mismatches, rebuild schemas with coercers
   - `remove-extra-fields.ts` — Strip hallucinated fields not in schema, recursive

2. **Build Repair Pipeline** (`packages/core/src/repair/index.ts`)
   - Phase 1: String strategies (sequential)
   - Phase 2: JSON parse
   - Phase 3: Direct Zod validation
   - Phase 4: Object strategies (iterative, max 3 passes)

3. **Develop Public API** (`packages/core/src/index.ts`)
   - `repair(schema, input)` — Quick repair, throws on failure
   - `repairOutput(options)` — Full options repair with detailed result
   - `isValid(schema, input)` — Boolean validation check
   - `analyzeInput(input)` — Input analysis without repair

4. **Error Handling** (`packages/core/src/utils/errors.ts`)
   - `StructuredRepairError` — Base class with `code` and `context`
   - `UnrepairableError` — All strategies exhausted
   - `SchemaMismatchError` — Type coercion failed
   - `JsonSyntaxError` — Input not parseable as JSON

5. **Type Safety**
   - Full generic inference: `repair(schema)` returns `z.infer<T>`
   - All types exported from `packages/core/src/repair/types.ts`
   - `RepairStrategyName`, `RepairOptions<T>`, `RepairResult<T>`, `RepairStep`
   - No `any` in public API; Zod internal access uses biome-ignore comments

## When to Use This Skill

- Implementing a new repair strategy
- Refactoring the repair pipeline orchestrator
- Adding new public API methods
- Fixing type coercion bugs
- Adding support for new Zod schema types in `coerce-types` or `remove-extra-fields`

## Example Requests

```
"Implement a new repair strategy for the core package"

"Add support for ZodMap in the coerce-types strategy"

"Fix a bug in the remove-extra-fields recursive walker"

"Add a new option to repairOutput for controlling max passes"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Strategy implementation in `packages/core/src/repair/`
- [ ] Registered in the pipeline (`repair/index.ts`)
- [ ] Full TypeScript types with strict mode
- [ ] JSDoc comments on all public exports
- [ ] Colocated tests at `packages/core/src/repair/<name>.test.ts`
- [ ] Error handling for edge cases
- [ ] All existing tests still pass (`pnpm test`)

## Dependencies

This skill requires:
- Setup skill completed (monorepo structure in place)
- Core package built (`pnpm build`)
- Understanding of Zod schema validation internals
- Knowledge of JSON syntax and parsing
- Familiarity with TypeScript generics

## Package Structure

```
packages/core/
├── src/
│   ├── index.ts              # Public API barrel (repair, repairOutput, isValid, analyzeInput)
│   ├── repair/
│   │   ├── index.ts          # Pipeline orchestrator + strategy registry
│   │   ├── types.ts          # RepairOptions<T>, RepairResult<T>, RepairStep, etc.
│   │   ├── strip-fences.ts   # Strategy 1: markdown fence removal
│   │   ├── fix-json.ts       # Strategy 2: JSON syntax repair
│   │   ├── coerce-types.ts   # Strategy 3: Zod type coercion
│   │   └── remove-extra-fields.ts  # Strategy 4: hallucinated field removal
│   ├── types/
│   │   └── index.ts          # Type re-exports
│   └── utils/
│       ├── errors.ts         # Error class hierarchy
│       └── logger.ts         # Debug logger
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Repair Pipeline Flow

```typescript
// Phase 1: String strategies (operate on raw string)
for (const strategy of stringStrategies) {
  input = strategy(input);
  steps.push({ strategy, success: true, inputBefore, outputAfter: input });
}

// Phase 2: Parse JSON
let parsed = JSON.parse(input);
// On failure: return failure with syntax error

// Phase 3: Direct validation
const result = schema.safeParse(parsed);
if (result.success) return { success: true, data: result.data };

// Phase 4: Object strategies (operate on parsed object, iterative)
for (let pass = 0; pass < MAX_PASSES; pass++) {
  for (const strategy of objectStrategies) {
    parsed = strategy(schema, parsed);
    steps.push({ strategy, ... });
    const recheck = schema.safeParse(parsed);
    if (recheck.success) return { success: true, data: recheck.data };
  }
}
```

## Technical Specifications

### Adding a New Strategy

1. Create `packages/core/src/repair/<name>.ts` exporting a function
2. Register it in `packages/core/src/repair/index.ts`:
   - String strategy: add to `STRING_STRATEGIES` map
   - Object strategy: add to `OBJECT_STRATEGIES` map
3. Add the strategy name to `RepairStrategyName` union in `types.ts`
4. Create `packages/core/src/repair/<name>.test.ts` with colocated tests

### Zod Internal Access Patterns

The `coerce-types` and `remove-extra-fields` strategies access Zod internals via `_def` to walk recursive schema trees. Each access uses a biome-ignore comment:

```typescript
// biome-ignore lint/suspicious/noExplicitAny: accessing Zod internals
const shape = (schema as any)._def.shape;
```

### Import Conventions

- Within core: use relative `.js` extension imports (`'./strip-fences.js'`)
- Within mcp importing core: use scoped package import (`'@reaatech/structured-repair-core'`)
- Tests: import from sibling source files (`'./coerce-types.js'`)

## Best Practices

1. **Single Responsibility** — Each strategy does one thing well
2. **Pure Functions** — String strategies are pure; object strategies may modify in place
3. **Fail Fast** — Validate early, fail with clear error codes
4. **Preserve Data** — Never lose information during repair
5. **Test Edge Cases** — Test with malformed, nested, and complex LLM outputs
6. **Idempotence** — Running repair multiple times on already-valid input is safe
7. **Type Safety** — Use TypeScript generics; only use `any` with biome-ignore for Zod internals

## Troubleshooting

### Issue: Strategy over-corrects valid JSON
- **Solution**: The pipeline validates after each phase; over-correction is caught

### Issue: Type coercion doesn't handle a new Zod type
- **Solution**: Add a branch for the type in `makeCoercedSchema()` using `instanceof` checks

### Issue: Extra field removal breaks union validation
- **Solution**: `remove-extra-fields` tries each union branch and returns the first valid result

## Resources

- [Zod Documentation](https://zod.dev/)
- [Zod Source (internal types)](https://github.com/colinhacks/zod/tree/master/src)
- [DEV_PLAN.md](../DEV_PLAN.md) — Full implementation specifications

## Related Skills

- [`setup.md`](./setup.md) — Project initialization
- [`testing.md`](./testing.md) — Writing comprehensive tests
- [`documentation.md`](./documentation.md) — API documentation
