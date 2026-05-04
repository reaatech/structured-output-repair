# Skill: MCP (Model Context Protocol)

**Category**: Integration
**Difficulty**: Advanced
**Estimated Time**: 2-4 hours

## Overview

This skill covers the MCP server implementation in `@reaatech/structured-repair-mcp`, which exposes the core repair engine as MCP tools over stdio transport for use with Claude Desktop and other MCP-compatible clients.

## Capabilities

An AI agent with this skill can:

1. **Implement MCP Server** (`packages/mcp/src/server.ts`)
   - Create MCP server using `@modelcontextprotocol/sdk`
   - Configure `StdioServerTransport` for CLI usage
   - Register tool handlers for `CallToolRequestSchema` and `ListToolsRequestSchema`
   - Handle MCP protocol errors gracefully

2. **Define MCP Tools**
   - `structured.repair` — Repair malformed LLM output against a JSON Schema
   - `structured.analyze` — Analyze input for repair issues without applying repairs
   - Validate arguments with Zod before processing

3. **Build Executable Binary** (`packages/mcp/src/index.ts`)
   - `#!/usr/bin/env node` shebang
   - Calls `startServer()` and handles top-level errors
   - Configured via `"bin"` and `"postbuild": "chmod +x dist/index.js"` in `package.json`

4. **Schema Conversion** (`packages/mcp/src/utils.ts`)
   - `jsonSchemaToZod()` converts JSON Schema to Zod schema
   - Supports: `string`, `number`, `integer`, `boolean`, `null`, `object` (with `properties`/`required`), `array` (with `items`), `enum`, constraints (`minimum`, `maximum`, `minLength`, `maxLength`, `pattern`)

5. **MCP Client Integration**
   - Configure for Claude Desktop via `claude_desktop_config.json`
   - Use `npx @reaatech/structured-repair-mcp` as the command

## When to Use This Skill

- Adding a new MCP tool
- Updating tool definitions or input schemas
- Fixing MCP protocol issues
- Adding support for new JSON Schema keywords
- Integrating with new MCP clients

## Example Requests

```
"Add a new MCP tool to the structured-repair-mcp server"

"Fix MCP tool response formatting for the analyze tool"

"Add support for oneOf in the JSON Schema to Zod converter"

"Configure structured-repair for use with Claude Desktop"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Updated MCP server with properly registered tools
- [ ] Tool argument validation via Zod schemas
- [ ] Correct MCP response format (`{ content: [{ type: "text", text: ... }] }`)
- [ ] Error handling with `isError: true` for failed tool calls
- [ ] All tests passing (`pnpm test`)
- [ ] Claude Desktop configuration example updated if needed

## Dependencies

This skill requires:
- Core package built (`@reaatech/structured-repair-core`)
- Understanding of MCP protocol (stdio transport, JSON-RPC 2.0)
- Knowledge of Zod schema validation
- `@modelcontextprotocol/sdk` installed

## Package Structure

```
packages/mcp/
├── src/
│   ├── index.ts         # Binary entry (#!/usr/bin/env node, calls startServer)
│   ├── server.ts        # MCP server, tools, request handlers
│   ├── server.test.ts   # Tests for MCP server tools
│   ├── utils.ts         # JSON Schema → Zod conversion
│   └── utils.test.ts    # Tests for schema conversion
├── package.json         # @reaatech/structured-repair-mcp, bin + postbuild
├── tsconfig.json
└── vitest.config.ts
```

## Import Pattern

The MCP package imports from the core package via the scoped package name (workspace protocol):

```typescript
// packages/mcp/src/server.ts
import { repairOutput, analyzeInput } from '@reaatech/structured-repair-core';
import type { RepairStrategyName } from '@reaatech/structured-repair-core';
import { jsonSchemaToZod } from './utils.js';
```

Do NOT use relative paths like `../../core/src/repair/index.js` — always use the package import.

## MCP Server Implementation

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export function createStructuredRepairServer(): Server {
  const server = new Server(
    { name: 'structured-output-repair', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'structured.repair', description: '...', inputSchema: { ... } },
      { name: 'structured.analyze', description: '...', inputSchema: { ... } },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'structured.repair') return await handleRepairTool(args);
    if (name === 'structured.analyze') return await handleAnalyzeTool(args);
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  });

  return server;
}

export async function startServer() {
  const server = createStructuredRepairServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

## Claude Desktop Configuration

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

## Testing MCP Tools

Tests use MCP SDK's `InMemoryTransport` and `Client` to test tools without real stdio:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createStructuredRepairServer } from './server.js';

describe('MCP Server', () => {
  let client: Client;
  let server: ReturnType<typeof createStructuredRepairServer>;

  beforeEach(async () => {
    server = createStructuredRepairServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  it('should repair valid JSON input', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: { input: '{ "name": "John" }', schema: { ... } },
    });
    // Assert on result content
  });
});
```

## Best Practices

1. **Error Handling** — Always catch and format errors as MCP responses with `isError: true`
2. **Input Validation** — Validate tool arguments with Zod before calling core functions
3. **Response Format** — Follow MCP content format exactly: `{ content: [{ type: "text", text: ... }] }`
4. **Stderr for Logs** — Use `console.error` for server log messages (stdio transport uses stdout for protocol)
5. **Type Imports** — Import types from `@reaatech/structured-repair-core`, not via relative paths
6. **ReDoS Protection** — Document that `pattern` in JSON Schema compiles to RegExp; warn about ReDoS

## Troubleshooting

### Issue: MCP client can't find tool
- **Solution**: Check tool name matches exactly; verify `npx @reaatech/structured-repair-mcp` runs

### Issue: Tool returns malformed response
- **Solution**: Ensure response has `content` array with `{ type: "text", text: string }` items

### Issue: Schema conversion fails for a JSON Schema keyword
- **Solution**: Add a handler for the keyword in `jsonSchemaToZod()` in `utils.ts`

### Issue: Binary doesn't start
- **Solution**: Check shebang line, verify `postbuild` ran `chmod +x`, check `dist/index.js` exists

## Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Setup](https://modelcontextprotocol.io/quickstart/user)

## Related Skills

- [`implementation.md`](./implementation.md) — Core library implementation (depended on by MCP)
- [`testing.md`](./testing.md) — Testing MCP tools with InMemoryTransport
- [`documentation.md`](./documentation.md) — Documenting MCP tools
- [`ci-cd.md`](./ci-cd.md) — Building and publishing the MCP binary
