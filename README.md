# structured-output-repair

[![CI](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

> Repair malformed LLM structured outputs instead of crashing.

Every production agent system has this problem: you ask for JSON, you get JSON wrapped in markdown fences, or with trailing commas, or missing closing braces, or with hallucinated fields. This library takes a **Zod schema** plus the raw LLM output and attempts graduated repair across four strategies — it either returns valid, schema-conforming data or gives you detailed diagnostics explaining what went wrong.

This monorepo provides a core repair engine library and an MCP server tool for use with Claude Desktop and other MCP-compatible clients.

## Features

- **Four graduated repair strategies** — strip-fences, fix-json-syntax, coerce-types, remove-extra-fields
- **Full type inference** — repaired data inherits the exact `z.infer<T>` type from your Zod schema
- **Detailed failure diagnostics** — per-strategy step tracking, accumulated errors, and on-failure callbacks
- **Input analysis** — inspect raw LLM output for common issues without applying repairs
- **MCP server** — expose repair functionality as MCP tools (`structured.repair`, `structured.analyze`) for Claude Desktop and other clients
- **JSON Schema → Zod conversion** — the MCP tool accepts standard JSON Schema; no programmatic Zod required
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

| Strategy | What it fixes |
|----------|---------------|
| `strip-fences` | Markdown code fences (` ```json {...} ``` `), nested fences, language hints |
| `fix-json-syntax` | Trailing commas, missing braces/brackets, unquoted keys, single quotes, missing commas, `NaN`/`Infinity`/`undefined`, comments |
| `coerce-types` | String→number, string→boolean, string→bigint, string→date, nested object/array coercion |
| `remove-extra-fields` | Hallucinated fields not in schema, deeply nested (works with `.strict()` schemas) |

## Documentation

- [`AGENTS.md`](./AGENTS.md) — AI agent development guide, coding conventions, and monorepo structure
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow, coding standards, and release process
- [`DEV_PLAN.md`](./DEV_PLAN.md) — Complete implementation specification

## License

[MIT](LICENSE)
