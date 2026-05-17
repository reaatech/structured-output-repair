import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { analyzeInput, repairOutput } from '@reaatech/structured-repair-core';
import type { RepairStrategyName } from '@reaatech/structured-repair-core';
import { z } from 'zod';
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
    },
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
              description: 'The raw LLM output to repair',
            },
            schema: {
              type: 'object',
              description: 'JSON Schema to validate against',
            },
            options: {
              type: 'object',
              properties: {
                debug: {
                  type: 'boolean',
                  description: 'Enable debug logging',
                  default: false,
                },

                strategies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Custom repair strategies to apply',
                },
              },
            },
          },
          required: ['input', 'schema'],
        },
      },
      {
        name: 'structured.analyze',
        description: 'Analyze input for repair issues without applying repairs',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'The raw LLM output to analyze',
            },
          },
          required: ['input'],
        },
      },
    ],
  }));

  // Tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'structured.repair') {
      return await handleRepairTool(args);
    }
    if (name === 'structured.analyze') {
      return await handleAnalyzeTool(args);
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  });

  return server;
}

const repairArgsSchema = z.object({
  input: z.string(),
  schema: z.record(z.string(), z.unknown()),
  options: z
    .object({
      debug: z.boolean().optional(),
      strategies: z.array(z.string()).optional(),
    })
    .optional(),
});

const analyzeArgsSchema = z.object({
  input: z.string(),
});

async function handleRepairTool(args: unknown) {
  const parsed = repairArgsSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text',
          text: `Invalid arguments: ${parsed.error.message}`,
        },
      ],
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
      strategies: strategies as RepairStrategyName[] | undefined,
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
      content: [
        {
          type: 'text',
          text: `Invalid arguments: ${parsed.error.message}`,
        },
      ],
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
