# structured-output-repair

[![CI](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

> Repair malformed LLM structured outputs instead of crashing.

Every production agent system has this problem: you ask for JSON, you get JSON wrapped in markdown fences, or buried in prose, or with trailing commas, or cut off mid-stream, or with hallucinated/misnamed fields. This library takes a **Zod schema** plus the raw LLM output and attempts graduated repair across six strategies — it either returns valid, schema-conforming data or gives you detailed diagnostics (including best-effort partial data and per-field errors) explaining what went wrong.

This monorepo provides a core repair engine library and an MCP server tool for use with Claude Desktop and other MCP-compatible clients.

## Features

- **Six graduated repair strategies** — strip-fences, extract-json, fix-json-syntax, coerce-types, fuzzy-match-keys, remove-extra-fields
- **Prose extraction** — pulls the JSON out of conversational wrappers like `Sure! Here is the JSON: {...}`
- **Truncation repair** — closes unterminated strings, dangling separators, and missing braces from cut-off streams
- **Python-literal tolerance** — normalizes `True`/`False`/`None` (and `NaN`/`Infinity`/`undefined`) to valid JSON
- **Fuzzy key matching** — maps hallucinated/misnamed keys to schema keys (`e-mail` → `email`, `first_name` → `firstName`)
- **Full type inference** — repaired data inherits the exact `z.infer<T>` type from your Zod schema
- **Detailed failure diagnostics** — per-strategy step tracking, accumulated errors, best-effort `partialData`, and per-`fieldErrors` paths
- **Input analysis** — inspect raw LLM output for common issues without applying repairs
- **MCP server** — expose repair functionality as MCP tools (`structured.repair`, `structured.analyze`) for Claude Desktop and other clients
- **Rich JSON Schema → Zod conversion** — `anyOf`/`oneOf`/`allOf`, `$ref`/`$defs` (incl. recursive), `const`, `default`, nullable type arrays, `format` (email/uri/uuid/date-time), `additionalProperties`, and tuples
- **Strategy customization** — pick which strategies to run, in what order
- **Dual ESM/CJS output** — works with `import` and `require`

## Installation

### Using the packages

Packages are published under the `@reaatech` scope and can be installed individually:

```bash
# Core repair engine
pnpm add @reaatech/structured-repair-core

# MCP server tool
pnpm add @reaatech/structured-repair-mcp
```

### Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/structured-output-repair.git
cd structured-output-repair

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the test suite
pnpm test

# Run linting
pnpm lint
```

## Quick Start

Repair LLM output with a single function call:

```typescript
import { z } from "zod";
import { repair } from "@reaatech/structured-repair-core";

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
});

// LLM output with multiple issues — fences, trailing comma, string coercion
const llmOutput = '```json\n{ "name": "John", "age": "30" }\n```';

const result = await repair(userSchema, llmOutput);
// => { name: "John", age: 30 }
```

Use the MCP server with Claude Desktop:

```json
{
  "mcpServers": {
    "structured-repair": {
      "command": "npx",
      "args": ["@reaatech/structured-repair-mcp"]
    }
  }
}
```

## Packages

| Package | Description |
| ------- | ----------- |
| [`@reaatech/structured-repair-core`](./packages/core) | Core repair engine with four graduated strategies, types, and error classes |
| [`@reaatech/structured-repair-mcp`](./packages/mcp) | MCP server exposing repair as tools for Claude Desktop and other MCP clients |

## Repair Strategies

Strategies run in order; the engine validates after each and returns as soon as the data conforms.

| Strategy | What it fixes |
|----------|---------------|
| `strip-fences` | Markdown code fences (` ```json {...} ``` `), nested fences, language hints |
| `extract-json` | JSON embedded in conversational prose (`Here is the JSON: {...}`); string-aware, also recovers truncated tails |
| `fix-json-syntax` | Trailing commas, missing/unbalanced braces & brackets, unquoted keys, single quotes, missing commas, comments, `NaN`/`Infinity`/`undefined`, Python `True`/`False`/`None`, and truncated/cut-off output |
| `coerce-types` | String→number, string→boolean, string→bigint, string→date, nested object/array coercion |
| `fuzzy-match-keys` | Hallucinated/misnamed keys remapped to schema keys by case/separator (`e-mail` → `email`, `first_name` → `firstName`) |
| `remove-extra-fields` | Hallucinated fields not in schema, deeply nested (works with `.strict()` schemas) |

On failure, `repairOutput` returns `partialData` (the best-effort parsed value) and `fieldErrors` (per-field schema violations with dot/bracket paths like `address.zip` or `tags[1]`) alongside the step-by-step `steps` and `errors`.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — AI agent development guide, coding conventions, and monorepo structure
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow, coding standards, and release process
- [`DEV_PLAN.md`](./DEV_PLAN.md) — Complete implementation specification

## License

[MIT](LICENSE)
