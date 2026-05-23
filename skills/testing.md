# Skill: Testing

**Category**: Quality Assurance
**Difficulty**: Intermediate
**Estimated Time**: 1-2 hours per module

## Overview

This skill covers writing comprehensive unit tests, integration tests, and benchmarks for the structured-output-repair monorepo. Tests are colocated with source files and run via Vitest with `globals: false`.

## Capabilities

An AI agent with this skill can:

1. **Write Unit Tests**
   - Test individual repair strategies in isolation
   - Mock Zod schemas for testing
   - Test error handling and edge cases
   - Colocate tests as `src/repair/<name>.test.ts`

2. **Write Integration Tests**
   - Test the full repair pipeline end-to-end
   - Test with real-world LLM output scenarios
   - Test MCP tool integration via InMemoryTransport

3. **Write Benchmarks**
   - Performance benchmarks for repair operations
   - Test with large inputs
   - Validate performance targets

4. **Edge Case Testing**
   - Malformed JSON variations
   - Nested structure edge cases
   - Unicode and special characters
   - Empty and null values
   - All Zod schema types in `coerce-types` and `remove-extra-fields`

## When to Use This Skill

- After implementing a new repair strategy
- When adding new public API methods
- Before merging feature branches
- When fixing bugs (regression tests)
- When optimizing performance

## Example Requests

```
"Write unit tests for the strip-fences strategy"

"Create integration tests for the full repair pipeline"

"Add edge case tests for ZodDiscriminatedUnion in coerce-types"

"Write performance benchmarks for the fix-json strategy"
```

## Output Expectations

After using this skill, the agent should deliver:

- [x] Unit tests colocated as `src/*.test.ts`
- [x] Integration tests in `src/integration/`
- [x] Benchmarks in `src/bench/`
- [x] All tests passing (`pnpm test`)
- [x] No type errors (`pnpm typecheck`)

## Dependencies

This skill requires:
- Setup skill completed (vitest configured)
- Implementation skill completed (code to test)
- Understanding of Vitest with `globals: false`

## Test Structure

Tests are **colocated** with source files, not in a separate `test/` directory:

```
packages/core/src/
├── index.ts
├── public-api.test.ts              # Tests the public API barrel
├── repair/
│   ├── index.ts
│   ├── repair.test.ts              # Tests the repair pipeline
│   ├── partial-result.test.ts      # Tests partialData / fieldErrors on failure
│   ├── strip-fences.ts
│   ├── strip-fences.test.ts        # Tests strip-fences strategy
│   ├── extract-json.ts
│   ├── extract-json.test.ts        # Tests extract-json strategy
│   ├── fix-json.ts
│   ├── fix-json.test.ts            # Tests fix-json strategy (incl. Python literals, truncation)
│   ├── coerce-types.ts
│   ├── coerce-types.test.ts        # Basic coercion tests
│   ├── coerce-types-advanced.test.ts  # Advanced Zod type tests
│   ├── fuzzy-match-keys.ts
│   ├── fuzzy-match-keys.test.ts    # Tests fuzzy key remapping
│   ├── remove-extra-fields.ts
│   ├── remove-extra-fields.test.ts    # Basic field removal tests
│   └── remove-extra-fields-advanced.test.ts  # Advanced Zod type tests
├── integration/
│   └── full-repair.test.ts         # End-to-end repair pipeline tests
├── bench/
│   └── repair.bench.ts             # Performance benchmarks
└── utils/
    ├── logger.ts
    └── logger.test.ts              # Tests the debug logger
```

```
packages/mcp/src/
├── index.ts
├── server.ts
├── server.test.ts                  # Tests MCP server tools
├── utils.ts
└── utils.test.ts                   # Tests JSON Schema → Zod conversion
```

## Vitest Configuration

All tests use `globals: false` — explicit imports required:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stripFences } from './strip-fences.js';

describe('stripFences', () => {
  it('should remove json code fences', () => {
    const input = '```json\n{ "name": "test" }\n```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });
});
```

## Per-Package vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
```

## Import Patterns in Tests

| Test location | Source being tested | Import path |
|---------------|-------------------|-------------|
| `src/repair/fix-json.test.ts` | `src/repair/fix-json.ts` | `'./fix-json.js'` |
| `src/repair/repair.test.ts` | `src/repair/index.ts` | `'./index.js'` |
| `src/repair/coerce-types.test.ts` | `src/utils/errors.ts` | `'../utils/errors.js'` |
| `src/integration/full-repair.test.ts` | `src/repair/index.ts` | `'../repair/index.js'` |
| `src/public-api.test.ts` | `src/index.ts` | `'./index.js'` |
| `packages/mcp/src/server.test.ts` | `packages/mcp/src/server.ts` | `'./server.js'` |

## Test Categories

### 1. Unit Tests (per strategy)

Test each strategy function in isolation with a variety of inputs.

```typescript
it('should handle unquoted object keys', () => {
  expect(fixJsonSyntax('{ name: "test" }')).toBe('{ "name": "test" }');
});
```

### 2. Integration Tests

Test the full `repair()` pipeline with realistic multi-issue LLM output.

```typescript
it('should handle real-world LLM output', async () => {
  const input = '```json\n{ name: \'John\', "age": "30", extra: 1 }\n```';
  const result = await repair(strictSchema, input);
  expect(result).toEqual({ name: 'John', age: 30 });
});
```

### 3. Advanced Zod Type Tests

Test strategies with all Zod schema types (`ZodUnion`, `ZodDiscriminatedUnion`, `ZodLazy`, `ZodMap`, `ZodSet`, etc.).

```typescript
it('should handle recursive schemas via ZodLazy', () => {
  type Category = { name: string; subcategories: Category[] };
  const categorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
      name: z.string(),
      subcategories: z.array(categorySchema),
    })
  );
  const data = { name: 'Root', subcategories: [{ name: 'Child', subcategories: [], extra: true }] };
  const result = removeExtraFields(categorySchema, data);
  expect(result).toEqual({ name: 'Root', subcategories: [{ name: 'Child', subcategories: [] }] });
});
```

### 4. Benchmarks

Performance tests run via `vitest bench` (not part of `pnpm test`).

```typescript
import { describe, bench } from 'vitest';
import { repair } from '../repair/index.js';

describe('repair performance', () => {
  bench('small valid JSON', async () => {
    await repair(schema, '{"name":"test","age":25}');
  });
});
```

## Running Tests

```bash
# Run all tests across both packages
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests for a specific package
pnpm --filter @reaatech/structured-repair-core test

# Run benchmarks
pnpm --filter @reaatech/structured-repair-core exec vitest bench --run
```

## Best Practices

1. **Test Isolation** — Each test should be independent, no shared mutable state
2. **Descriptive Names** — Test names should describe the behavior being verified
3. **Arrange-Act-Assert** — Follow AAA pattern for test structure
4. **Explicit Imports** — Always import from `vitest`; no globals
5. **Colocated Tests** — Tests live next to source: `src/foo.test.ts`
6. **Test Errors** — Verify error handling, not just success paths
7. **Keep Tests Fast** — Avoid external dependencies, network calls in unit tests

## Troubleshooting

### Issue: Test fails with "Cannot find module"
- **Solution**: Check import path is relative to the current file with `.js` extension

### Issue: vi.spyOn / vi.fn not found
- **Solution**: Verify `vi` is imported from vitest: `import { vi } from 'vitest'`

### Issue: Tests pass locally but fail in CI
- **Solution**: Tests should be deterministic; avoid timing dependencies

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)

## Related Skills

- [`implementation.md`](./implementation.md) — Core library implementation
- [`ci-cd.md`](./ci-cd.md) — CI/CD pipeline with automated testing
- [`setup.md`](./setup.md) — Test environment configuration
