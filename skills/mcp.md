# Skill: MCP (Model Context Protocol)

**Category**: Integration  
**Difficulty**: Advanced  
**Estimated Time**: 2-4 hours

## Overview

This skill covers implementing the MCP (Model Context Protocol) server for structured-output-repair, allowing the library to be used as an AI tool via the `structured.repair` MCP tool.

## Capabilities

An AI agent with this skill can:

1. **Implement MCP Server**
   - Create MCP server using @modelcontextprotocol/sdk
   - Configure StdioServerTransport for CLI usage
   - Implement tool registration and request handling
   - Handle MCP protocol errors gracefully

2. **Define MCP Tools**
   - Create `structured.repair` tool definition
   - Define input schema for the tool
   - Implement tool execution logic
   - Return properly formatted MCP responses

3. **Build Executable Binary**
   - Configure package.json bin entry
   - Create CLI entry point with shebang
   - Handle command-line arguments
   - Implement proper error exit codes

4. **Schema Conversion**
   - Convert JSON Schema to Zod schema
   - Handle common schema patterns
   - Provide schema validation errors
   - Support nested schema structures

5. **MCP Client Integration**
   - Configure for Claude Desktop
   - Support other MCP clients
   - Handle tool discovery
   - Implement proper tool response formatting

## When to Use This Skill

- Setting up MCP server for the first time
- Adding new MCP tools
- Updating tool definitions
- Fixing MCP protocol issues
- Integrating with new MCP clients

## Example Requests

```
"Create the MCP server for structured-output-repair"

"Define the structured.repair tool with proper input schema"

"Configure the binary to work with Claude Desktop"

"Add JSON Schema to Zod conversion for MCP tool"

"Fix MCP tool response formatting issues"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Working MCP server implementation
- [ ] Properly defined MCP tools
- [ ] Executable binary that starts MCP server
- [ ] Schema conversion utilities
- [ ] Claude Desktop configuration example
- [ ] Error handling for MCP protocol issues
- [ ] All tests passing

## Dependencies

This skill requires:
- Setup skill completed (project structure in place)
- Implementation skill completed (core library working)
- Understanding of MCP protocol
- Knowledge of Zod schema validation
- Access to DEV_PLAN.md for specifications

## Technical Specifications

### MCP Server Implementation

```typescript
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { repairOutput, analyzeInput } from '../index.js';
import { jsonSchemaToZod } from './utils.js';

export function createStructuredRepairServer(): Server {
  const server = new Server(
    {
      name: 'structured-output-repair',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'structured.repair',
        description: 'Repair malformed LLM structured output against a JSON Schema',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'The raw LLM output to repair'
            },
            schema: {
              type: 'object',
              description: 'JSON Schema to validate against'
            },
            options: {
              type: 'object',
              properties: {
                debug: { 
                  type: 'boolean',
                  description: 'Enable debug logging',
                  default: false
                },

                strategies: { 
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Custom repair strategies to apply'
                }
              }
            }
          },
          required: ['input', 'schema']
        }
      },
      {
        name: 'structured.analyze',
        description: 'Analyze input for repair issues without applying repairs',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'The raw LLM output to analyze'
            }
          },
          required: ['input']
        }
      }
    ]
  }));

  // Tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'structured.repair') {
      return await handleRepairTool(args);
    } else if (name === 'structured.analyze') {
      return await handleAnalyzeTool(args);
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${name}`
    );
  });

  return server;
}

const repairArgsSchema = z.object({
  input: z.string(),
  schema: z.record(z.unknown()),
  options: z.object({
    debug: z.boolean().optional(),
    strategies: z.array(z.string()).optional(),
  }).optional(),
});

const analyzeArgsSchema = z.object({
  input: z.string(),
});

async function handleRepairTool(args: unknown) {
  const parsed = repairArgsSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { input, schema, options = {} } = parsed.data;

  try {
    const zodSchema = jsonSchemaToZod(schema);
    const { strategies, ...restOptions } = options;
    const result = await repairOutput({
      schema: zodSchema,
      input,
      ...restOptions,
      strategies: strategies as import('../repair/types.js').RepairStrategyName[] | undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleAnalyzeTool(args: unknown) {
  const parsed = analyzeArgsSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }

  const { input } = parsed.data;

  try {
    const analysis = analyzeInput(input);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

export async function startServer() {
  const server = createStructuredRepairServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server started');
}
```

### Binary Entry Point

```typescript
// src/mcp/index.ts
#!/usr/bin/env node

import { startServer } from './server.js';

startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
```

### JSON Schema to Zod Conversion

```typescript
// src/mcp/utils.ts
import { z } from 'zod';

export function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType {
  if (!schema || typeof schema !== 'object') {
    return z.unknown();
  }

  const { type, properties, items, required, enum: enumValues } = schema as {
    type?: string;
    properties?: Record<string, Record<string, unknown>>;
    items?: Record<string, unknown>;
    required?: string[];
    enum?: unknown[];
  };

  // Handle enum
  if (enumValues) {
    return z.enum(enumValues.map(String));
  }

  // Handle object type
  if (type === 'object' && properties) {
    const shape: Record<string, z.ZodType> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      const isRequired = required?.includes(key) ?? false;
      let fieldSchema = jsonSchemaToZod(value);
      
      if (!isRequired) {
        fieldSchema = fieldSchema.optional();
      }
      
      shape[key] = fieldSchema;
    }

    return z.object(shape);
  }

  // Handle array type
  if (type === 'array' && items) {
    return z.array(jsonSchemaToZod(items));
  }

  // Handle primitive types
  switch (type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'integer':
      return z.number().int();
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    default:
      return z.unknown();
  }
}
```

### Claude Desktop Configuration

```json
// Example claude_desktop_config.json
{
  "mcpServers": {
    "structured-repair": {
      "command": "npx",
      "args": ["structured-repair"]
    }
  }
}
```

## MCP Protocol Details

### Tool Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "structured.repair",
    "arguments": {
      "input": "```json\n{ \"name\": \"John\" }\n```",
      "schema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" }
        },
        "required": ["name"]
      }
    }
  }
}
```

### Tool Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": { \"name\": \"John\" },\n  \"steps\": [...]\n}"
      }
    ]
  }
}
```

## Testing MCP Implementation

```typescript
// test/mcp/server.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStructuredRepairServer } from '../../src/mcp/server.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server', () => {
  let server: ReturnType<typeof createStructuredRepairServer>;

  beforeEach(() => {
    server = createStructuredRepairServer();
  });

  it('should list structured.repair tool', async () => {
    const response = await server.request(
      { method: 'tools/list', jsonrpc: '2.0', id: 1 },
      ListToolsRequestSchema
    );
    expect(response.tools).toHaveLength(2);
    expect(response.tools[0].name).toBe('structured.repair');
  });

  it('should repair valid JSON input', async () => {
    const result = await server.request(
      {
        method: 'tools/call',
        jsonrpc: '2.0',
        id: 2,
        params: {
          name: 'structured.repair',
          arguments: {
            input: '{ "name": "John" }',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          }
        }
      },
      CallToolRequestSchema
    );

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ name: 'John' });
  });
});
```

## Best Practices

1. **Error Handling** - Always catch and format errors for MCP responses
2. **Input Validation** - Validate tool arguments before processing
3. **Response Format** - Follow MCP response format exactly
4. **Logging** - Log errors to stderr, not stdout (MCP uses stdio)
5. **Performance** - Keep tool execution under 30 seconds
6. **Documentation** - Provide clear tool descriptions and parameter docs

## Common Issues

### Issue: MCP client can't find tool
- **Solution**: Check tool name matches exactly, verify server is running

### Issue: Tool returns malformed response
- **Solution**: Ensure response follows MCP format with content array

### Issue: Schema conversion fails
- **Solution**: Add support for more JSON Schema patterns, provide helpful error messages

### Issue: Binary doesn't start
- **Solution**: Check shebang line, verify package.json bin entry, ensure file is executable

## Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Setup](https://modelcontextprotocol.io/quickstart/user)
- [DEV_PLAN.md MCP Section](../DEV_PLAN.md#mcp-tool-implementation)

## Related Skills

- [`implementation.md`](./implementation.md) - Core library implementation
- [`ci-cd.md`](./ci-cd.md) - Publishing npm packages and binaries
- [`documentation.md`](./documentation.md) - Documenting MCP tools
