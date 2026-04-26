import { bench, describe } from 'vitest';
import { z } from 'zod';
import { repair } from '../../src/repair/index.js';

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
});

describe('repair performance', () => {
  bench('small valid json', async () => {
    await repair(schema, '{ "name": "John", "age": 30 }');
  });

  bench('fenced json', async () => {
    await repair(schema, '```json\n{ "name": "John", "age": 30 }\n```');
  });

  bench('multiple issues', async () => {
    await repair(schema, '```json\n{ "name": \'John\', "age": "30", "extra": 1, }\n```');
  });

  bench('large array (1000 items)', async () => {
    const largeSchema = z.object({
      items: z.array(z.object({ id: z.number(), name: z.string() }).strict()),
    });
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      extra: 'field',
    }));
    await repair(largeSchema, `{ "items": ${JSON.stringify(items)} }`);
  });
});
