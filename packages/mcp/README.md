# @reaatech/structured-repair-mcp

[![npm version](https://img.shields.io/npm/v/@reaatech/structured-repair-mcp.svg)](https://www.npmjs.com/package/@reaatech/structured-repair-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/structured-output-repair/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/structured-output-repair/ci.yml?branch=main&label=CI)](https://github.com/reaatech/structured-output-repair/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

MCP (Model Context Protocol) server that exposes `structured-output-repair` as tools. Use with Claude Desktop, Cursor, or any MCP-compatible client to repair malformed LLM structured outputs via structured tool calls.

## Installation

```bash
npm install @reaatech/structured-repair-mcp
# or
pnpm add @reaatech/structured-repair-mcp
```

## Feature Overview

- **Two MCP tools** — `structured.repair` and `structured.analyze`
- **JSON Schema input** — describe your expected output shape as standard JSON Schema (no programmatic Zod required)
- **Automatic schema conversion** — JSON Schema → Zod is handled internally
- **Strategy control** — choose which repair strategies to apply per tool call
- **Input analysis** — inspect LLM output for common issues before committing to repair
- **Stdio transport** — standard MCP transport, compatible with all MCP clients
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

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

### Using the MCP Server Programmatically

```typescript
import { createStructuredRepairServer } from "@reaatech/structured-repair-mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = createStructuredRepairServer();

// Listen on stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Tools

### `structured.repair`

Repair malformed LLM output against a JSON Schema. Accepts a raw string `input`, a `schema` object (JSON Schema), and optional `options`.

```json
{
  "name": "structured.repair",
  "arguments": {
    "input": "```json\n{\"name\": \"Alice\", \"age\": \"30\"}\n```",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "number" }
      },
      "required": ["name", "age"]
    },
    "options": {
      "debug": false,
      "strategies": ["strip-fences", "fix-json-syntax", "coerce-types"]
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": { "name": "Alice", "age": 30 },
  "originalInput": "```json\n{\"name\": \"Alice\", \"age\": \"30\"}\n```",
  "repairedInput": "{\"name\": \"Alice\", \"age\": \"30\"}",
  "steps": [
    { "strategy": "strip-fences", "success": true },
    { "strategy": "fix-json-syntax", "success": true },
    { "strategy": "coerce-types", "success": true }
  ],
  "errors": []
}
```

#### `structured.repair` Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | `string` | Yes | The raw LLM output to repair |
| `schema` | `object` | Yes | JSON Schema to validate against (see supported subset below) |
| `options.debug` | `boolean` | No | Enable debug logging (default: `false`) |
| `options.strategies` | `string[]` | No | Custom repair strategies to apply (default: all six — `strip-fences`, `extract-json`, `fix-json-syntax`, `coerce-types`, `fuzzy-match-keys`, `remove-extra-fields`) |

### `structured.analyze`

Analyze raw input for repair issues without applying repairs. Useful for diagnostics or conditional tool flows.

```json
{
  "name": "structured.analyze",
  "arguments": {
    "input": "```json\n{\"a\": 1, }\n```"
  }
}
```

**Response:**

```json
{
  "isValidJson": false,
  "hasFences": true,
  "issues": [
    { "type": "fence-wrapper", "description": "Input is wrapped in markdown code fences" },
    { "type": "trailing-comma", "description": "Trailing comma found before closing brace" }
  ]
}
```

#### `structured.analyze` Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `input` | `string` | Yes | The raw LLM output to analyze |

### Supported JSON Schema

The MCP server converts JSON Schema to Zod internally. Supported keywords:

| Keyword | Notes |
|---------|-------|
| `type` | `string`, `number`, `integer`, `boolean`, `null`, `object`, `array`; also `type` arrays such as `["string","null"]` (nullable) |
| `properties`, `required` | `object` type |
| `additionalProperties` | `false` → strict, `true` → passthrough, schema → catchall / record |
| `items` | `array` type; an array of schemas becomes a tuple |
| `minItems`, `maxItems` | `array` type |
| `enum`, `const` | Any type |
| `anyOf`, `oneOf` | Union of subschemas |
| `allOf` | Intersection of subschemas |
| `$ref`, `$defs`, `definitions` | Local JSON Pointer refs, including recursive refs |
| `default` | Any type |
| `minimum`, `maximum` | `number`, `integer` |
| `minLength`, `maxLength`, `pattern` | `string` type |
| `format` | `string` type: `email`, `uri`/`url`, `uuid`, `date-time` |

Unrecognized keywords/types fall back to `z.unknown()` (permissive) rather than failing.

> **Security Note:** `pattern` is compiled with `new RegExp(...)`. Invalid patterns are ignored rather than throwing, but a *valid* yet pathological pattern can still cause catastrophic backtracking (ReDoS) in the server process — only pass schemas from trusted sources.

## API Reference

### `createStructuredRepairServer(): Server`

Creates and configures an MCP server instance with `structured.repair` and `structured.analyze` tools registered.

```typescript
import { createStructuredRepairServer } from "@reaatech/structured-repair-mcp";

const server = createStructuredRepairServer();
// Server has two tools: structured.repair, structured.analyze
```

### `startServer(): Promise<void>`

Creates a server, connects it to `StdioServerTransport`, and begins listening. This is the entry point called by the binary (`npx @reaatech/structured-repair-mcp`).

```typescript
import { startServer } from "@reaatech/structured-repair-mcp";

await startServer();
```

### `jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType`

Converts a JSON Schema object to a Zod schema. Used internally but exported for direct use.

```typescript
import { jsonSchemaToZod } from "@reaatech/structured-repair-mcp";

const zodSchema = jsonSchemaToZod({
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "number", minimum: 0 },
  },
  required: ["name"],
});

// zodSchema is a Zod schema ready for validation
```

## Related Packages

- [`@reaatech/structured-repair-core`](https://www.npmjs.com/package/@reaatech/structured-repair-core) — Core repair engine with six graduated strategies

## License

[MIT](https://github.com/reaatech/structured-output-repair/blob/main/LICENSE)
