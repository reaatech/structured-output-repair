import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStructuredRepairServer } from './server.js';

type TextContent = { type: string; text: string };

function getContent(result: { content: unknown }): TextContent {
  const items = (result as unknown as { content: unknown[] }).content as TextContent[];
  const item = items[0];
  if (!item) throw new Error('No content in tool result');
  return item;
}

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

  it('should list structured.repair tool', async () => {
    const response = await client.listTools();
    expect(response.tools).toHaveLength(2);
    expect(response.tools[0]?.name).toBe('structured.repair');
    expect(response.tools[1]?.name).toBe('structured.analyze');
  });

  it('should repair valid JSON input', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: '{ "name": "John" }',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
    const parsed = JSON.parse(content.text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ name: 'John' });
  });

  it('should handle fenced JSON input', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: '```json\n{ "age": 30 }\n```',
        schema: {
          type: 'object',
          properties: {
            age: { type: 'number' },
          },
          required: ['age'],
        },
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
    const parsed = JSON.parse(content.text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ age: 30 });
  });

  it('should return error for invalid input', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: 'not json',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
    const parsed = JSON.parse(content.text);
    expect(parsed.success).toBe(false);
  });

  it('should analyze input', async () => {
    const result = await client.callTool({
      name: 'structured.analyze',
      arguments: {
        input: '```json\n{ "a": 1, }\n```',
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
    const parsed = JSON.parse(content.text);
    expect(parsed.hasFences).toBe(true);
    expect(parsed.isValidJson).toBe(false);
  });

  it('should handle unknown tool name', async () => {
    await expect(
      client.callTool({
        name: 'unknown.tool',
        arguments: {},
      }),
    ).rejects.toThrow();
  });

  it('should return error for invalid repair args', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: 123,
        schema: { type: 'object', properties: {}, required: [] },
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
    expect(content.text.startsWith('Invalid arguments')).toBe(true);
  });

  it('should return error for invalid analyze args', async () => {
    const result = await client.callTool({
      name: 'structured.analyze',
      arguments: {
        input: 42,
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
  });

  it('should handle repair with broken schema gracefully', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: '{}',
        schema: { type: 'invalid' },
      },
    });

    const content = getContent(result as unknown as { content: unknown });
    expect(content.type).toBe('text');
  });
});
