# @reaatech/structured-repair-core

[![npm version](https://img.shields.io/npm/v/@reaatech/structured-repair-core.svg)](https://www.npmjs.com/package/@reaatech/structured-repair-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/structured-output-repair/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/structured-output-repair/ci.yml?branch=main&label=CI)](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Core repair engine that catches malformed LLM structured outputs and repairs them instead of crashing. Takes a **Zod schema** plus raw LLM output and applies a graduated pipeline of six strategies to produce valid, schema-conforming data.

> **Peer dependency:** `zod` (`^3.23.0 || ^4.4.0`) is a peer dependency — install it in your project alongside this package. Both zod 3 and zod 4 schema objects are supported at runtime.

## Installation

```bash
npm install @reaatech/structured-repair-core
# or
pnpm add @reaatech/structured-repair-core
```

## Feature Overview

- **6 graduated repair strategies** — applied in sequence, each targeting a specific class of LLM output failure
- **Prose extraction** — pulls JSON out of conversational wrappers like `Sure! Here is the JSON: {...}`
- **Truncation repair** — closes unterminated strings, dangling separators, and missing braces from cut-off streams
- **Type coercion** — auto-converts string→number, string→boolean, string→date, and more via Zod's coercion primitives
- **Fuzzy key matching** — remaps hallucinated/misnamed keys to schema keys (`e-mail` → `email`, `first_name` → `firstName`)
- **Extra field removal** — recursively strips hallucinated fields not defined in your schema (critical for `.strict()`)
- **Input analysis** — inspects raw input for common issues without applying repairs
- **Strategy customization** — pick which strategies to run, in what order
- **Detailed result tracking** — per-step metadata, plus best-effort `partialData` and per-field `fieldErrors` on failure
- **Full type inference** — repaired data inherits the exact `z.infer<T>` type from your schema
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import { z } from "zod";
import { repair, repairOutput, isValid, analyzeInput } from "@reaatech/structured-repair-core";

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
});

// LLM output with fences, trailing comma, string coercion
const llmOutput = '```json\n{ "name": "John", "age": "30" }\n```';

// Quick repair — throws UnrepairableError on failure
const data = await repair(userSchema, llmOutput);
// => { name: "John", age: 30 }

// Full repair with detailed result
const result = await repairOutput({
  schema: userSchema,
  input: llmOutput,
  debug: true,
  strategies: ["strip-fences", "fix-json-syntax", "coerce-types"],
});
```

## Repair Strategies

Strategies run in this order; the engine validates after each and returns as soon as the data conforms.

| Strategy | What it fixes |
|----------|---------------|
| `strip-fences` | Markdown code fences (` ```json {...} ``` `), nested fences, language hints |
| `extract-json` | JSON embedded in conversational prose (`Here is the JSON: {...}`); string-aware, also recovers truncated tails |
| `fix-json-syntax` | Trailing commas, missing/unbalanced braces & brackets, unquoted keys, single quotes, missing commas, comments, `NaN`/`Infinity`/`undefined`, Python `True`/`False`/`None`, and truncated/cut-off output |
| `coerce-types` | String→number, string→boolean, string→bigint, string→date, nested object/array coercion |
| `fuzzy-match-keys` | Hallucinated/misnamed keys remapped to schema keys by case/separator (`e-mail` → `email`, `first_name` → `firstName`) |
| `remove-extra-fields` | Hallucinated fields not in schema, deeply nested (works with `.strict()` schemas) |

## API Reference

### `repair(schema, input)`

Quick repair that returns typed data or throws `UnrepairableError`. Runs the full default strategy pipeline; use `repairOutput` if you need diagnostics or custom strategies.

```typescript
import { repair } from "@reaatech/structured-repair-core";

const data = await repair(userSchema, rawLlmOutput);
```

| Argument | Type | Description |
|----------|------|-------------|
| `schema` | `z.ZodType<T>` | Zod schema to validate against |
| `input` | `string` | Raw LLM output string |

### `repairOutput(options)`

Full repair with detailed step-by-step result information.

```typescript
import { repairOutput } from "@reaatech/structured-repair-core";

const result = await repairOutput({
  schema: userSchema,
  input: rawLlmOutput,
  debug: true,
  strategies: ["strip-fences", "fix-json-syntax", "coerce-types"],
  onFailure: (context) => {
    console.error("Repair failed:", context.errors);
  },
});

if (result.success) {
  console.log("Repaired:", result.data);
  console.log("Steps:", result.steps);
} else {
  console.log("Errors:", result.errors);
}
```

### `RepairOptions<T>`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `schema` | `z.ZodType<T>` | (required) | Zod schema to validate against |
| `input` | `string` | (required) | Raw LLM output string |
| `debug` | `boolean` | `false` | Enable debug logging to stderr |
| `strategies` | `RepairStrategyName[]` | All six | Which strategies to apply, in order |
| `onFailure` | `(context: RepairFailureContext) => void` | — | Callback invoked when all strategies fail |

### `RepairResult<T>`

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | Whether repair produced valid data |
| `data` | `T \| null` | Repaired data (typed per schema), or null on failure |
| `originalInput` | `string` | The input as received |
| `repairedInput` | `string?` | Input after string-level repairs |
| `steps` | `RepairStep[]` | Per-strategy attempt details |
| `errors` | `RepairError[]` | Accumulated errors across all strategies |
| `partialData` | `unknown?` | On failure: best-effort parsed value that still failed validation (`undefined` if JSON never parsed) |
| `fieldErrors` | `FieldError[]?` | On failure: per-field schema violations with dot/bracket `path`s (e.g. `address.zip`, `tags[1]`) |

### `isValid(schema, input)`

Check if input is valid against the schema without applying repairs.

```typescript
import { isValid } from "@reaatech/structured-repair-core";

const ok = isValid(userSchema, '{ "name": "test", "age": 25 }');
// => true
```

### `analyzeInput(input)`

Analyze raw input for common issues without applying repairs.

```typescript
import { analyzeInput } from "@reaatech/structured-repair-core";

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

### Error Classes

All errors extend `StructuredRepairError` which includes `code: string` and `message: string`.

| Class | Code | When |
|-------|------|------|
| `StructuredRepairError` | (custom) | Base class for all repair errors |
| `UnrepairableError` | `UNREPAIRABLE` | All repair strategies exhausted without success |
| `SchemaMismatchError` | `SCHEMA_MISMATCH` | Type coercion failed at the Zod level |
| `JsonSyntaxError` | `JSON_SYNTAX_ERROR` | Input could not be parsed as JSON |

## Usage Patterns

### Debugging a Failed Repair

```typescript
const result = await repairOutput({
  schema: mySchema,
  input: badLlmOutput,
  debug: true,
  onFailure: ({ originalInput, lastAttempt, errors, steps }) => {
    console.error("Repair failed for input:", originalInput);
    console.error("Last attempt:", lastAttempt);
    console.error("Steps:", JSON.stringify(steps, null, 2));
    console.error("Errors:", errors);
  },
});
```

### Recovering Partial Data on Failure

```typescript
const result = repairOutput({ schema: userSchema, input: badLlmOutput });

if (!result.success) {
  // Best-effort value that still failed validation (undefined if JSON never parsed)
  console.log("Partial:", result.partialData);
  // Which fields were wrong, with paths like "address.zip" or "tags[1]"
  for (const { path, message } of result.fieldErrors ?? []) {
    console.warn(`${path}: ${message}`);
  }
}
```

### Custom Strategy Order

```typescript
// Skip extra field removal, run coerce-types first
const result = repairOutput({
  schema: mySchema,
  input: rawLlmOutput,
  strategies: ["coerce-types", "fix-json-syntax"],
});
```

### Strict Schema with Extra Fields

```typescript
const strictSchema = z.object({
  id: z.number(),
  name: z.string(),
}).strict(); // Any extra field will cause validation failure

const llmOutput = '{ "id": 1, "name": "Alice", "hallucinated": true }';

// remove-extra-fields strategy strips "hallucinated" automatically
const data = await repair(strictSchema, llmOutput);
// => { id: 1, name: "Alice" }
```

## Related Packages

- [`@reaatech/structured-repair-mcp`](https://www.npmjs.com/package/@reaatech/structured-repair-mcp) — MCP server exposing repair as tools for Claude Desktop and other MCP clients

## License

[MIT](https://github.com/reaatech/structured-output-repair/blob/main/LICENSE)
