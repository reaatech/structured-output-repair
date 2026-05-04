import { describe, expect, it } from 'vitest';
import { stripFences } from './strip-fences.js';

describe('stripFences', () => {
  it('should remove json code fences', () => {
    const input = '```json\n{ "name": "test" }\n```';
    const expected = '{ "name": "test" }';
    expect(stripFences(input)).toBe(expected);
  });

  it('should handle uppercase JSON', () => {
    const input = '```JSON\n{ "name": "test" }\n```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle javascript fences', () => {
    const input = '```javascript\n{ "name": "test" }\n```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle typescript fences', () => {
    const input = '```typescript\n{ "name": "test" }\n```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle no fences', () => {
    const input = '{ "name": "test" }';
    expect(stripFences(input)).toBe(input);
  });

  it('should handle nested fences', () => {
    const input = '````json\n```json\n{ "name": "test" }\n```\n````';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle fences without newlines', () => {
    const input = '```json { "name": "test" } ```';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle leading and trailing whitespace', () => {
    const input = '   \n```json\n{ "name": "test" }\n```\n   ';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle empty content in fences', () => {
    const input = '```json\n\n```';
    expect(stripFences(input)).toBe('');
  });

  it('should handle 4+ backtick fences', () => {
    const input = '````json\n{ "name": "test" }\n````';
    expect(stripFences(input)).toBe('{ "name": "test" }');
  });

  it('should handle js and ts shorthand fences', () => {
    expect(stripFences('```js\n{ "name": "test" }\n```')).toBe('{ "name": "test" }');
    expect(stripFences('```ts\n{ "name": "test" }\n```')).toBe('{ "name": "test" }');
  });

  it('should handle fences with only backticks and no language', () => {
    expect(stripFences('```\n{ "name": "test" }\n```')).toBe('{ "name": "test" }');
  });
});
