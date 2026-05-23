import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { repair } from '../repair/index.js';

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

  it('should extract JSON wrapped in conversational prose', async () => {
    const input =
      'Sure! Here is the data you requested: { "name": "Eve", "age": 31 }. Let me know!';
    const result = await repair(userSchema, input);
    expect(result).toEqual({ name: 'Eve', age: 31 });
  });

  it('should normalize Python-style literals', async () => {
    const schema = z.object({ name: z.string(), active: z.boolean(), note: z.string().nullable() });
    const input = '{ "name": "Frank", "active": True, "note": None }';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'Frank', active: true, note: null });
  });

  it('should fix hallucinated key casing/separators', async () => {
    const schema = z.object({ firstName: z.string(), lastName: z.string() }).strict();
    const input = '{ "first_name": "Grace", "last-name": "Hopper" }';
    const result = await repair(schema, input);
    expect(result).toEqual({ firstName: 'Grace', lastName: 'Hopper' });
  });

  it('should repair truncated/cut-off output', async () => {
    const input = '{ "name": "Heidi", "age": 27, "tags": ["a", "b';
    const result = await repair(userSchema, input);
    expect(result).toEqual({ name: 'Heidi', age: 27, tags: ['a', 'b'] });
  });

  it('should combine prose extraction, fences, literals, and fuzzy keys', async () => {
    const schema = z
      .object({ userName: z.string(), isAdmin: z.boolean(), score: z.number() })
      .strict();
    const input = `Here's the result:
\`\`\`json
{ "user_name": "Ivy", "is_admin": False, "score": "98", "debug": True }
\`\`\`
Hope this helps!`;
    const result = await repair(schema, input);
    expect(result).toEqual({ userName: 'Ivy', isAdmin: false, score: 98 });
  });
});
