# Skill: Testing

**Category**: Quality Assurance  
**Difficulty**: Intermediate  
**Estimated Time**: 1-2 hours per module

## Overview

This skill covers writing comprehensive unit tests, integration tests, and end-to-end tests for the structured-output-repair library. It includes test setup, coverage requirements, and testing best practices.

## Capabilities

An AI agent with this skill can:

1. **Write Unit Tests**
   - Test individual repair strategies in isolation
   - Mock Zod schemas for testing
   - Test error handling and edge cases
   - Achieve 90%+ code coverage per module

2. **Write Integration Tests**
   - Test the full repair pipeline
   - Test strategy chaining and fallback
   - Test with real-world LLM output samples
   - Test MCP tool integration

3. **Create Test Fixtures**
   - Build sample LLM outputs with various issues
   - Create Zod schema test fixtures
   - Build expected output comparisons

4. **Performance Testing**
   - Benchmark repair operations
   - Test with large inputs
   - Measure memory usage
   - Validate performance targets (< 100ms for typical inputs)

5. **Edge Case Testing**
   - Malformed JSON variations
   - Nested structure edge cases
   - Unicode and special characters
   - Empty and null values
   - Extremely large inputs

## When to Use This Skill

- After implementing a new repair strategy
- When adding new public API methods
- Before merging feature branches
- When fixing bugs (regression tests)
- When optimizing performance

## Example Requests

```
"Write unit tests for the strip-fences strategy with 90%+ coverage"

"Create integration tests for the full repair pipeline"

"Add edge case tests for nested object repair"

"Write performance benchmarks for the fix-json strategy"

"Create test fixtures for common LLM output issues"
```

## Output Expectations

After using this skill, the agent should deliver:

- [x] Unit tests for all public functions
- [x] Integration tests for pipeline flow
- [x] Edge case tests for error handling
- [ ] Test fixtures in test/fixtures/
- [x] 90%+ code coverage for modified modules
- [x] All tests passing (`pnpm test`)
- [x] Performance benchmarks meeting targets

## Dependencies

This skill requires:
- Setup skill completed (Vitest configured)
- Implementation skill completed (code to test)
- Understanding of Vitest testing framework
- Knowledge of Zod schema validation
- Access to DEV_PLAN.md for test specifications

## Test Structure

### Unit Tests

```typescript
// test/unit/strip-fences.test.ts
import { describe, it, expect } from 'vitest';
import { stripFences } from '../../src/repair/strip-fences';

describe('stripFences', () => {
  it('should remove json code fences', () => {
    const input = '```json\n{ "name": "test" }\n```';
    const expected = '{ "name": "test" }';
    expect(stripFences(input)).toBe(expected);
  });

  it('should handle uppercase JSON', () => {
    const input = '```JSON\n{ "name": "test" }\n```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  // More tests...
});
```

### Integration Tests

```typescript
// test/integration/full-repair.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { repair } from '../../src/index';

describe('repair pipeline', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional()
  });

  it('should handle multiple issues', async () => {
    const input = '```json\n{ "name": \'John\', "age": "30", "extra": 1, }\n```';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  // More tests...
});
```

### Test Fixtures

```json
// test/fixtures/malformed-1.json
{
  "description": "JSON with trailing commas and single quotes",
  "input": "{ 'name': 'John', 'age': 30, }",
  "expected": { "name": "John", "age": 30 }
}
```

## Coverage Requirements

| Module | Minimum Coverage |
|--------|-----------------|
| strip-fences.ts | 95% |
| fix-json.ts | 95% |
| coerce-types.ts | 90% |
| remove-extra-fields.ts | 90% |
| repair/index.ts | 95% |
| Public API | 100% |

## Testing Best Practices

1. **Test Isolation** - Each test should be independent
2. **Descriptive Names** - Test names should describe the behavior
3. **Arrange-Act-Assert** - Follow AAA pattern for test structure
4. **Edge Cases First** - Test boundary conditions before happy paths
5. **Mock External Dependencies** - Don't rely on external services
6. **Test Errors** - Verify error handling, not just success paths
7. **Keep Tests Fast** - Avoid slow operations in unit tests

## Test Categories

### 1. Happy Path Tests
Test the most common, expected usage patterns.

```typescript
it('should repair valid JSON with minor issues', async () => {
  const input = '{ "name": "John", "age": 30, }';
  const result = await repair(schema, input);
  expect(result).toEqual({ name: 'John', age: 30 });
});
```

### 2. Edge Case Tests
Test unusual but valid inputs.

```typescript
it('should handle empty objects', async () => {
  const schema = z.object({});
  const input = '{}';
  const result = await repair(schema, input);
  expect(result).toEqual({});
});
```

### 3. Error Handling Tests
Test graceful failure for unrepairable input.

```typescript
it('should throw UnrepairableError for completely invalid input', async () => {
  const input = 'this is not json at all';
  await expect(repair(schema, input)).rejects.toThrow(UnrepairableError);
});
```

### 4. Performance Tests
Test that operations complete within time limits.

```typescript
it('should repair large JSON within 100ms', async () => {
  const largeInput = JSON.stringify({
    items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
  });
  const start = Date.now();
  await repair(largeSchema, largeInput);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100);
});
```

### 5. Regression Tests
Test previously fixed bugs to prevent recurrence.

```typescript
it('should not strip legitimate backslashes (regression #42)', async () => {
  const input = '{ "path": "C:\\\\Users\\\\test" }';
  const result = await repair(schema, input);
  expect(result.path).toBe('C:\\Users\\test');
});
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm test strip-fences

# Run tests matching pattern
pnpm test -- --grep "repair"
```

## Debugging Tests

### Common Issues

**Issue**: Test passes locally but fails in CI
- **Solution**: Check for environment-specific code, ensure tests are deterministic

**Issue**: Tests are slow
- **Solution**: Profile test execution, optimize setup/teardown, consider splitting large test suites

**Issue**: Flaky tests (intermittent failures)
- **Solution**: Remove timing dependencies, mock external services, ensure test isolation

**Issue**: Low coverage despite many tests
- **Solution**: Add tests for error paths, edge cases, and conditional branches

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Principles](https://testing-library.com/)
- [Zod Testing Guide](https://zod.dev/?id=testing)
- [DEV_PLAN.md Test Cases](../DEV_PLAN.md#test-cases)

## Related Skills

- [`implementation.md`](./implementation.md) - Core library implementation
- [`ci-cd.md`](./ci-cd.md) - CI/CD pipeline with automated testing
- [`setup.md`](./setup.md) - Test environment configuration
