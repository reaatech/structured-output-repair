# structured-output-repair

[![npm version](https://badge.fury.io/js/structured-output-repair.svg)](https://badge.fury.io/js/structured-output-repair)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Repair malformed LLM structured outputs instead of crashing.

Every production agent system has this problem: you ask for JSON, you get JSON wrapped in markdown fences, or missing a closing brace, or with trailing commas, or with hallucinated fields. This library takes a **Zod schema** + the raw LLM output and attempts graduated repair:

1. **Strip markdown fences** — Remove ` ```json ... ``` ` wrappers
2. **Fix JSON syntax** — Repair trailing commas, missing braces, unquoted keys, single quotes, etc.
3. **Coerce types** — Use Zod's built-in coercion to handle string→number, string→boolean, etc.
4. **Remove extra fields** — Strip hallucinated fields not in your schema (great for `.strict()` schemas)

Ships as both an **npm library** and an **MCP tool** (`structured.repair`).

---

## Installation

```bash
npm install structured-output-repair zod
# or
pnpm add structured-output-repair zod
```

**Requirements:** Node.js 20+

---

## Quick Start

```typescript
import { z } from 'zod';
import { repair } from 'structured-output-repair';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
});

// LLM output with multiple issues
const llmOutput = '```json\n{ "name": "John", "age": "30", "email": "john@example.com" }\n```';

const result = await repair(userSchema, llmOutput);
// result: { name: "John", age: 30, email: "john@example.com" }
```

---

## API

### `repair(schema, input)`

Quick repair that throws `UnrepairableError` if the input cannot be fixed.

```typescript
import { repair } from 'structured-output-repair';

const data = await repair(mySchema, rawLlmOutput);
```

### `repairOutput(options)`

Full repair with detailed result information.

```typescript
import { repairOutput } from 'structured-output-repair';

const result = await repairOutput({
  schema: mySchema,
  input: rawLlmOutput,
  debug: true,
  strategies: ['strip-fences', 'fix-json-syntax', 'coerce-types'],
  onFailure: (context) => {
    console.error('Repair failed:', context.errors);
  },
});

if (result.success) {
  console.log('Repaired:', result.data);
} else {
  console.log('Steps:', result.steps);
  console.log('Errors:', result.errors);
}
```

### `isValid(schema, input)`

Check if input is valid against the schema without repair.

```typescript
import { isValid } from 'structured-output-repair';

const ok = isValid(mySchema, '{ "name": "test" }');
```

### `analyzeInput(input)`

Analyze input for common issues without applying repairs.

```typescript
import { analyzeInput } from 'structured-output-repair';

const analysis = analyzeInput('```json\n{ "a": 1, }\n```');
// {
//   isValidJson: false,
//   hasFences: true,
//   issues: [
//     { type: 'fence-wrapper', description: '...' },
//     { type: 'trailing-comma', description: '...' }
//   ]
// }
```

---

## MCP Tool

Use `structured-output-repair` as an MCP server with Claude Desktop or any MCP client.

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "structured-repair": {
      "command": "npx",
      "args": ["structured-repair"]
    }
  }
}
```

### Available Tools

- **`structured.repair`** — Repair malformed LLM output against a JSON Schema
- **`structured.analyze`** — Analyze input for repair issues without applying repairs

### Supported JSON Schema subset

The MCP server converts JSON Schema to Zod for validation. Supported keywords:
`type` (`string`, `number`, `integer`, `boolean`, `null`, `object`, `array`),
`properties`, `required`, `items`, `enum`, `minimum`, `maximum`, `minLength`,
`maxLength`, `pattern`.

Not yet supported: `$ref`, `$defs`, `allOf`, `anyOf`, `oneOf`,
`additionalProperties`, `format`.

> **Note:** `pattern` is compiled with `new RegExp(...)`. Only pass schemas from
> trusted sources — a pathological pattern can cause catastrophic backtracking
> (ReDoS) in the server process.

---

## Repair Strategies

| Strategy | What it fixes |
|----------|---------------|
| `strip-fences` | ` ```json {...} ``` `, ` ```javascript {...} ``` `, nested fences |
| `fix-json-syntax` | Trailing commas, missing braces/brackets, unquoted keys, single quotes, missing commas, `NaN`/`Infinity`/`undefined`, comments |
| `coerce-types` | String→number, string→boolean, string→bigint, string→date, array wrapping |
| `remove-extra-fields` | Hallucinated fields not in schema (useful with `.strict()`) |

---

## TypeScript

Written in strict TypeScript with full type inference from your Zod schemas.

```typescript
const schema = z.object({ id: z.number(), name: z.string() });
const result = await repair(schema, input);
// result is typed as { id: number; name: string }
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT — see [LICENSE](./LICENSE) for details.
