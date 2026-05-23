import { describe, expect, it } from 'vitest';
import { extractJson } from './extract-json.js';

describe('extractJson', () => {
  it('extracts an object embedded in leading and trailing prose', () => {
    const input = 'Sure! Here is the JSON you asked for: {"ok": true}. Hope that helps!';
    expect(extractJson(input)).toBe('{"ok": true}');
  });

  it('extracts an array embedded in prose', () => {
    const input = 'The results are [1, 2, 3] as requested.';
    expect(extractJson(input)).toBe('[1, 2, 3]');
  });

  it('picks whichever delimiter appears first', () => {
    expect(extractJson('text [1, 2] then {"a": 1}')).toBe('[1, 2]');
    expect(extractJson('text {"a": 1} then [1, 2]')).toBe('{"a": 1}');
  });

  it('handles nested structures', () => {
    const input = 'data: {"a": {"b": [1, 2]}, "c": 3} done';
    expect(extractJson(input)).toBe('{"a": {"b": [1, 2]}, "c": 3}');
  });

  it('ignores delimiters inside string values', () => {
    const input = 'out: {"msg": "use } and ] carefully"} end';
    expect(extractJson(input)).toBe('{"msg": "use } and ] carefully"}');
  });

  it('is a no-op for already-clean JSON', () => {
    const input = '{"a": 1, "b": [2, 3]}';
    expect(extractJson(input)).toBe(input);
  });

  it('returns input unchanged when no delimiter is present', () => {
    const input = 'no json here at all';
    expect(extractJson(input)).toBe(input);
  });

  it('returns from the opener to the end for truncated output', () => {
    const input = 'Here you go: {"a": 1, "b": ';
    expect(extractJson(input)).toBe('{"a": 1, "b": ');
  });
});
