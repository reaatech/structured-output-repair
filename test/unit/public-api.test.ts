import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  repair,
  repairOutput,
  isValid,
  analyzeInput,
  StructuredRepairError,
  UnrepairableError,
  SchemaMismatchError,
  JsonSyntaxError,
} from '../../src/index.js';

describe('Public API', () => {
  const schema = z.object({ name: z.string() });

  it('should export repair function', async () => {
    const result = await repair(schema, '{ "name": "test" }');
    expect(result).toEqual({ name: 'test' });
  });

  it('should export repairOutput function', async () => {
    const result = await repairOutput({ schema, input: '{ "name": "test" }' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'test' });
  });

  it('should export isValid function', () => {
    expect(isValid(schema, '{ "name": "test" }')).toBe(true);
    expect(isValid(schema, '{ "name": 123 }')).toBe(false);
  });

  it('should export analyzeInput function', () => {
    const result = analyzeInput('{ "name": "test" }');
    expect(result.isValidJson).toBe(true);
  });

  it('should export StructuredRepairError', () => {
    const err = new StructuredRepairError('msg', 'CODE', { key: 'val' });
    expect(err.message).toBe('msg');
    expect(err.code).toBe('CODE');
    expect(err.context).toEqual({ key: 'val' });
  });

  it('should export UnrepairableError', () => {
    const err = new UnrepairableError('msg', 'input', []);
    expect(err.message).toBe('msg');
    expect(err.originalInput).toBe('input');
  });

  it('should export SchemaMismatchError', () => {
    const zodError = schema.safeParse({}).error!;
    const err = new SchemaMismatchError('msg', zodError);
    expect(err.message).toBe('msg');
    expect(err.zodError).toBe(zodError);
  });

  it('should export JsonSyntaxError', () => {
    const err = new JsonSyntaxError('msg', 10, 2, 5);
    expect(err.message).toBe('msg');
    expect(err.position).toBe(10);
    expect(err.line).toBe(2);
    expect(err.column).toBe(5);
  });
});
