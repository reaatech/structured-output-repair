import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { repair } from '../../src/repair/index.js';

describe('Full repair pipeline', () => {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
  });

  it('should handle real-world LLM output with fences and trailing comma', async () => {
    const input = `\`\`\`json
{
  "name": "Alice",
  "age": 28,
  "email": "alice@example.com",
  "tags": ["admin", "user",]
}
\`\`\``;
    const result = await repair(userSchema, input);
    expect(result).toEqual({
      name: 'Alice',
      age: 28,
      email: 'alice@example.com',
      tags: ['admin', 'user'],
    });
  });

  it('should handle single quotes and unquoted keys', async () => {
    const input = "{ name: 'Bob', age: '35' }";
    const result = await repair(userSchema, input);
    expect(result).toEqual({ name: 'Bob', age: 35 });
  });

  it('should handle missing closing braces and extra fields', async () => {
    const strictSchema = z
      .object({
        name: z.string(),
        age: z.number(),
      })
      .strict();
    const input = '{ "name": "Charlie", "age": 42, "extra": true';
    const result = await repair(strictSchema, input);
    expect(result).toEqual({ name: 'Charlie', age: 42 });
  });

  it('should handle nested objects with multiple issues', async () => {
    const schema = z.object({
      user: z
        .object({
          name: z.string(),
          profile: z
            .object({
              age: z.number(),
            })
            .strict(),
        })
        .strict(),
    });
    const input = `\`\`\`json
{
  "user": {
    "name": 'Diana',
    "profile": {
      "age": "29",
      "extra": "field",
    },
  },
}
\`\`\``;
    const result = await repair(schema, input);
    expect(result).toEqual({
      user: {
        name: 'Diana',
        profile: { age: 29 },
      },
    });
  });

  it('should handle arrays with mixed issues', async () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.number() }).strict()),
    });
    const input = '{ "items": [{ "id": "1", "extra": "x" }, { "id": "2", }] }';
    const result = await repair(schema, input);
    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });
});
