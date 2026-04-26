import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createStructuredRepairServer } from '../../src/mcp/server.js';

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
    expect(response.tools[0]!.name).toBe('structured.repair');
    expect(response.tools[1]!.name).toBe('structured.analyze');
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

    expect(result.content[0]!.type).toBe('text');
    const parsed = JSON.parse(result.content[0]!.text as string);
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

    expect(result.content[0]!.type).toBe('text');
    const parsed = JSON.parse(result.content[0]!.text as string);
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

    expect(result.content[0]!.type).toBe('text');
    const parsed = JSON.parse(result.content[0]!.text as string);
    expect(parsed.success).toBe(false);
  });

  it('should analyze input', async () => {
    const result = await client.callTool({
      name: 'structured.analyze',
      arguments: {
        input: '```json\n{ "a": 1, }\n```',
      },
    });

    expect(result.content[0]!.type).toBe('text');
    const parsed = JSON.parse(result.content[0]!.text as string);
    expect(parsed.hasFences).toBe(true);
    expect(parsed.isValidJson).toBe(false);
  });

  it('should handle unknown tool name', async () => {
    await expect(
      client.callTool({
        name: 'unknown.tool',
        arguments: {},
      })
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

    expect(result.content[0]!.type).toBe('text');
    expect((result.content[0]!.text as string).startsWith('Invalid arguments')).toBe(true);
  });

  it('should return error for invalid analyze args', async () => {
    const result = await client.callTool({
      name: 'structured.analyze',
      arguments: {
        input: 42,
      },
    });

    expect(result.content[0]!.type).toBe('text');
  });

  it('should handle repair with broken schema gracefully', async () => {
    const result = await client.callTool({
      name: 'structured.repair',
      arguments: {
        input: '{}',
        schema: { type: 'invalid' },
      },
    });

    expect(result.content[0]!.type).toBe('text');
  });
});
