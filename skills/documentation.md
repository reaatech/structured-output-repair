# Skill: Documentation

**Category**: Technical Writing  
**Difficulty**: Intermediate  
**Estimated Time**: 1-3 hours per document

## Overview

This skill covers creating and maintaining comprehensive documentation for the structured-output-repair library, including README, API documentation, usage examples, and inline code comments.

## Capabilities

An AI agent with this skill can:

1. **Write README Documentation**
   - Project overview and motivation
   - Installation instructions
   - Quick start guide
   - Comprehensive usage examples
   - API reference summary
   - Contributing guidelines

2. **Create API Documentation**
   - JSDoc comments for all public APIs
   - Type documentation with examples
   - Parameter descriptions
   - Return type documentation
   - Error documentation

3. **Write Usage Examples**
   - Basic usage scenarios
   - Advanced configuration examples
   - Integration examples (with popular frameworks)
   - MCP tool usage examples
   - Troubleshooting examples

4. **Add Inline Documentation**
   - Code comments explaining complex logic
   - Function purpose and behavior documentation
   - Algorithm explanations
   - Performance considerations

5. **Create Additional Documentation**
   - Migration guides
   - Changelog entries
   - Architecture documentation
   - Contributing guide
   - Code of conduct

## When to Use This Skill

- After implementing new features
- When creating a new project
- Before releasing a new version
- When updating existing documentation
- When adding new examples or tutorials

## Example Requests

```
"Write a comprehensive README for structured-output-repair"

"Add JSDoc comments to the repair() function with examples"

"Create usage examples for common LLM output repair scenarios"

"Document the MCP tool setup and configuration"

"Write a migration guide from v1 to v2"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Clear, concise documentation following project standards
- [ ] All public APIs documented with JSDoc
- [ ] Working code examples that can be copy-pasted
- [ ] Proper markdown formatting
- [ ] Links to related resources
- [ ] Consistent terminology and style
- [ ] Spell-checked and grammar-checked content

## Dependencies

This skill requires:
- Implementation skill completed (code to document)
- Understanding of the project's purpose and audience
- Knowledge of markdown formatting
- Access to DEV_PLAN.md for specifications
- Familiarity with JSDoc syntax

## Documentation Standards

### README Structure

```markdown
# structured-output-repair

[![npm version](https://badge.fury.io/js/structured-output-repair.svg)](https://badge.fury.io/js/structured-output-repair)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Brief description of what the library does and why it's useful.

## Installation

```bash
npm install structured-output-repair zod
# or
pnpm add structured-output-repair zod
```

## Quick Start

```typescript
import { z } from 'zod';
import { repair } from 'structured-output-repair';

const schema = z.object({
  name: z.string(),
  age: z.number()
});

const llmOutput = '```json\n{ "name": "John", "age": "30" }\n```';
const result = await repair(schema, llmOutput);
// { name: "John", age: 30 }
```

## Table of Contents
- [Features](#features)
- [Usage](#usage)
- [API Reference](#api-reference)
- [MCP Tool](#mcp-tool)
- [Contributing](#contributing)
- [License](#license)
```

### JSDoc Standards

```typescript
/**
 * Attempts to repair malformed LLM output against a Zod schema.
 * 
 * This function applies a graduated repair pipeline:
 * 1. Strip markdown fences
 * 2. Fix JSON syntax errors
 * 3. Coerce types via Zod
 * 4. Remove extra fields
 * 5. Relax schema as last resort
 * 
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { repair } from 'structured-output-repair';
 * 
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const result = await repair(schema, '```json\n{ "name": "John", "age": "30" }\n```');
 * // result: { name: "John", age: 30 }
 * ```
 * 
 * @param schema - The Zod schema to validate against
 * @param input - The raw LLM output to repair
 * @returns The parsed and validated data
 * @throws {UnrepairableError} If the input cannot be repaired
 */
export async function repair<T extends z.ZodType>(
  schema: T,
  input: string
): Promise<z.infer<T>>;
```

### Code Comment Standards

```typescript
// Good: Explains WHY, not just WHAT
// Use regex to match markdown fences with optional language identifier
// This handles ```json, ```javascript, ```JSON, etc.
const fencePattern = /^```(?:json|javascript|typescript|js|ts)?\s*\n?/i;

// Good: Explains complex logic
// We need to handle nested braces carefully to avoid breaking
// on braces inside strings. Track whether we're inside a string
// and only count braces outside of strings.
let inString = false;
let escapeNext = false;
let braceCount = 0;

// Bad: States the obvious
// Increment counter
i++;
```

## Documentation Best Practices

1. **Write for Your Audience** - Assume developers familiar with TypeScript but new to this library
2. **Show, Don't Just Tell** - Use examples to demonstrate concepts
3. **Be Concise** - Get to the point quickly, avoid unnecessary words
4. **Use Consistent Terminology** - Pick terms and stick with them
5. **Keep It Updated** - Documentation should match the current code
6. **Include Error Handling** - Show how to handle common errors
7. **Link to Resources** - Reference related documentation and tools

## Documentation Types

### 1. Conceptual Documentation
Explains what the library does and why it's useful.

```markdown
## Why structured-output-repair?

When working with LLMs, you often request structured JSON output, but the model might return:
- JSON wrapped in markdown code fences
- JSON with syntax errors (trailing commas, missing quotes)
- JSON with type mismatches (strings instead of numbers)
- JSON with extra fields not in your schema

This library automatically repairs these issues so your application doesn't crash.
```

### 2. Tutorial Documentation
Step-by-step guide for getting started.

```markdown
## Tutorial: Repairing LLM Output

1. Install the library:
   ```bash
   pnpm add structured-output-repair zod
   ```

2. Define your expected output schema:
   ```typescript
   import { z } from 'zod';
   
   const userSchema = z.object({
     name: z.string(),
     email: z.string().email(),
     age: z.number().min(0)
   });
   ```

3. Repair the LLM output:
   ```typescript
   import { repair } from 'structured-output-repair';
   
   const llmOutput = await callLLM();
   const userData = await repair(userSchema, llmOutput);
   ```
```

### 3. Reference Documentation
Detailed API reference.

```markdown
## API Reference

### repair(schema, input)

Attempts to repair malformed LLM output against a Zod schema.

**Parameters:**
- `schema: z.ZodType` - The Zod schema to validate against
- `input: string` - The raw LLM output to repair

**Returns:** `Promise<z.infer<T>>` - The parsed and validated data

**Throws:**
- `UnrepairableError` - If the input cannot be repaired
- `SchemaMismatchError` - If the repaired data doesn't match the schema

**Example:**
```typescript
const result = await repair(schema, '```json\n{ "name": "John" }\n```');
```
```

### 4. Troubleshooting Documentation
Helps users solve common problems.

```markdown
## Troubleshooting

### "Input cannot be repaired" error

This error occurs when the input is too malformed to fix automatically.

**Solutions:**
1. Check that the input contains some JSON-like structure
2. Try using `analyzeInput()` to see what issues were detected
3. Consider relaxing your schema or using `repairOutput()` with custom strategies

### Performance issues with large inputs

For inputs over 10KB, consider:
1. Using the `strategies` option to skip unnecessary repair steps
2. Pre-processing the input to remove known issues
3. Breaking large outputs into smaller chunks
```

## Tools and Resources

- **Typedoc** - Generate API documentation from TypeScript
- **Markdown Lint** - Check markdown formatting
- **Prettier** - Format documentation files
- **GitHub Pages** - Host documentation site

## Common Documentation Issues

### Issue: Examples don't work
- **Solution**: Test all code examples, include necessary imports

### Issue: Documentation is outdated
- **Solution**: Update docs as part of every PR, add documentation checklist

### Issue: Missing important information
- **Solution**: Gather feedback from users, add FAQ section

### Issue: Hard to find information
- **Solution**: Improve navigation, add search functionality, create index

## Resources

- [JSDoc Documentation](https://jsdoc.app/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Documentation Best Practices](https://documentation.divio.com/)
- [DEV_PLAN.md](../DEV_PLAN.md) - Project specifications

## Related Skills

- [`implementation.md`](./implementation.md) - Core library implementation
- [`testing.md`](./testing.md) - Writing tests
- [`mcp.md`](./mcp.md) - MCP tool documentation
