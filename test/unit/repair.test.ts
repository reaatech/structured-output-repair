import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { repair, repairOutput, isValid, analyzeInput } from '../../src/repair/index.js';
import { UnrepairableError } from '../../src/utils/errors.js';

describe('repair', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email().optional(),
  });

  it('should repair fenced JSON', async () => {
    const input = '```json\n{ "name": "John", "age": 30 }\n```';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should repair trailing commas', async () => {
    const input = '{ "name": "John", "age": 30, }';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should repair missing closing brace', async () => {
    const input = '{ "name": "John", "age": 30';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should coerce string to number', async () => {
    const input = '{ "name": "John", "age": "30" }';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should remove extra fields', async () => {
    const strictSchema = z
      .object({
        name: z.string(),
        age: z.number(),
      })
      .strict();
    const input = '{ "name": "John", "age": 30, "extra": "field" }';
    const result = await repair(strictSchema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should handle multiple issues', async () => {
    const input = '```json\n{ "name": \'John\', "age": "30", "extra": 1, }\n```';
    const result = await repair(schema, input);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should throw UnrepairableError for unfixable input', async () => {
    const input = 'this is not json at all';
    await expect(repair(schema, input)).rejects.toThrow(UnrepairableError);
  });
});

describe('repairOutput', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('should return success true for valid input', async () => {
    const input = '{ "name": "John", "age": 30 }';
    const result = await repairOutput({ schema, input });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John', age: 30 });
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should return success false for unrepairable input', async () => {
    const input = 'this is not json at all';
    const result = await repairOutput({ schema, input });
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should call onFailure callback', async () => {
    const input = 'not json';
    const onFailure = vi.fn();
    await repairOutput({ schema, input, onFailure });
    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0]![0].originalInput).toBe(input);
  });

  it('should track repair steps', async () => {
    const input = '```json\n{ "name": "John", "age": 30 }\n```';
    const result = await repairOutput({ schema, input });
    expect(result.steps.some((s) => s.strategy === 'strip-fences')).toBe(true);
  });

  it('should work with custom strategies', async () => {
    const input = '```json\n{ "name": "John", "age": "30" }\n```';
    const result = await repairOutput({
      schema,
      input,
      strategies: ['strip-fences'],
    });
    expect(result.success).toBe(false);
    expect(result.steps.every((s) => s.strategy === 'strip-fences')).toBe(true);
  });

  it('should call onFailure in Phase 4 object strategy exhaustion', async () => {
    const input = '{ "name": "John", "age": "not-a-number" }';
    const onFailure = vi.fn();
    await repairOutput({ schema, input, onFailure });
    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0]![0].errors.length).toBeGreaterThan(0);
  });

  it('should handle empty strategies array', async () => {
    const input = '{ "name": "John", "age": 30 }';
    const result = await repairOutput({ schema, input, strategies: [] });
    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(0);
  });
});

describe('isValid', () => {
  const schema = z.object({ name: z.string() });

  it('should return true for valid input', () => {
    expect(isValid(schema, '{ "name": "John" }')).toBe(true);
  });

  it('should return false for invalid JSON', () => {
    expect(isValid(schema, '{ invalid }')).toBe(false);
  });

  it('should return false for schema mismatch', () => {
    expect(isValid(schema, '{ "name": 123 }')).toBe(false);
  });
});

describe('analyzeInput', () => {
  it('should detect fences', () => {
    const result = analyzeInput('```json\n{}\n```');
    expect(result.hasFences).toBe(true);
    expect(result.issues.some((i) => i.type === 'fence-wrapper')).toBe(true);
  });

  it('should detect valid JSON', () => {
    const result = analyzeInput('{ "a": 1 }');
    expect(result.isValidJson).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect trailing commas', () => {
    const result = analyzeInput('{ "a": 1, }');
    expect(result.isValidJson).toBe(false);
    expect(result.issues.some((i) => i.type === 'trailing-comma')).toBe(true);
  });

  it('should detect missing closing braces via unexpected end', () => {
    const result = analyzeInput('{ "a": ');
    expect(result.isValidJson).toBe(false);
    expect(result.issues.some((i) => i.type === 'missing-brace')).toBe(true);
  });

  it('should detect missing closing brackets via unexpected end', () => {
    const result = analyzeInput('[1, ');
    expect(result.isValidJson).toBe(false);
    expect(result.issues.some((i) => i.type === 'missing-bracket')).toBe(true);
  });

  it('should detect invalid values', () => {
    const result = analyzeInput('{ "a": NaN }');
    expect(result.isValidJson).toBe(false);
    expect(result.issues.some((i) => i.type === 'invalid-value')).toBe(true);
  });
});
