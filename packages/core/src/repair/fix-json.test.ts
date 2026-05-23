import { describe, expect, it } from 'vitest';
import { fixJsonSyntax } from './fix-json.js';

describe('fixJsonSyntax', () => {
  it('should remove trailing commas in objects', () => {
    const input = '{ "a": 1, "b": 2, }';
    const expected = '{ "a": 1, "b": 2 }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should remove trailing commas in arrays', () => {
    const input = '[1, 2, 3,]';
    const expected = '[1, 2, 3]';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should add missing closing brace', () => {
    const input = '{ "a": 1';
    const result = fixJsonSyntax(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it('should add missing closing bracket', () => {
    const input = '[1, 2, 3';
    const expected = '[1, 2, 3]';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should quote unquoted keys', () => {
    const input = '{ a: 1, b: 2 }';
    const expected = '{ "a": 1, "b": 2 }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should convert single quotes to double quotes', () => {
    const input = "{ 'a': 1, 'b': 2 }";
    const expected = '{ "a": 1, "b": 2 }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should add missing commas', () => {
    const input = '{ "a": 1 "b": 2 }';
    const expected = '{ "a": 1, "b": 2 }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should replace NaN with null', () => {
    const input = '{ "a": NaN }';
    const expected = '{ "a": null }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should replace Infinity with null', () => {
    const input = '{ "a": Infinity }';
    const expected = '{ "a": null }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should replace undefined with null', () => {
    const input = '{ "a": undefined }';
    const expected = '{ "a": null }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should remove single-line comments', () => {
    const input = '{ "a": 1 // comment\n}';
    const expected = '{ "a": 1 \n}';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should remove multi-line comments', () => {
    const input = '{ "a": 1 /* comment */ }';
    const expected = '{ "a": 1  }';
    expect(fixJsonSyntax(input)).toBe(expected);
  });

  it('should handle complex nested issues', () => {
    const input = `{
      "user": {
        "name": 'John',
        "age": 30,
      },
      "items": [1, 2, 3,]
    }`;
    const result = fixJsonSyntax(input);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.user.name).toBe('John');
    expect(parsed.user.age).toBe(30);
    expect(parsed.items).toEqual([1, 2, 3]);
  });

  it('should not alter valid JSON', () => {
    const input = '{ "a": 1, "b": [1, 2, 3], "c": { "d": "hello" } }';
    expect(fixJsonSyntax(input)).toBe(input);
  });

  it('should handle escaped quotes inside strings', () => {
    const input = '{ "path": "C:\\\\Users\\\\test" }';
    expect(fixJsonSyntax(input)).toBe(input);
  });

  it('should handle double quotes inside single-quoted strings', () => {
    const input = '{ "key": \'he said "hello"\' }';
    const result = fixJsonSyntax(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: 'he said "hello"' });
  });

  it('should fix missing commas between true/false/null values', () => {
    expect(fixJsonSyntax('{ "a": true "b": false }')).toBe('{ "a": true, "b": false }');
    expect(fixJsonSyntax('{ "a": null "b": 42 }')).toBe('{ "a": null, "b": 42 }');
  });

  it('should add missing opening brace for surplus closing brace', () => {
    const input = '"a": 1 }';
    const result = fixJsonSyntax(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  describe('Python literals', () => {
    it('should convert True/False to true/false', () => {
      expect(fixJsonSyntax('{ "a": True, "b": False }')).toBe('{ "a": true, "b": false }');
    });

    it('should convert None to null', () => {
      expect(fixJsonSyntax('{ "a": None }')).toBe('{ "a": null }');
    });

    it('should not convert Python literals inside string values', () => {
      const input = '{ "a": "True story, None taken" }';
      expect(fixJsonSyntax(input)).toBe(input);
    });
  });

  describe('string-aware comma insertion', () => {
    it('should not insert commas inside string values', () => {
      const input = '{ "note": "scored 5 [pts] and 2 {bonus}" }';
      const result = fixJsonSyntax(input);
      expect(JSON.parse(result)).toEqual({ note: 'scored 5 [pts] and 2 {bonus}' });
    });

    it('should not corrupt strings that contain bracket/value patterns', () => {
      const input = '{ "a": "1 [2] 3", "b": "true false" }';
      expect(fixJsonSyntax(input)).toBe(input);
    });
  });

  describe('truncation', () => {
    it('should close an unterminated string', () => {
      const result = fixJsonSyntax('{ "name": "Jo');
      expect(JSON.parse(result)).toEqual({ name: 'Jo' });
    });

    it('should close a truncated array of strings', () => {
      const result = fixJsonSyntax('{ "items": ["a", "b');
      expect(JSON.parse(result)).toEqual({ items: ['a', 'b'] });
    });

    it('should drop a dangling trailing comma at end of input', () => {
      const result = fixJsonSyntax('{ "a": 1, "b": 2,');
      expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
    });

    it('should supply null for a dangling trailing colon', () => {
      const result = fixJsonSyntax('{ "a": 1, "b":');
      expect(JSON.parse(result)).toEqual({ a: 1, b: null });
    });

    it('should repair deeply truncated nested output', () => {
      const result = fixJsonSyntax('{ "user": { "name": "Al", "tags": ["x"');
      expect(JSON.parse(result)).toEqual({ user: { name: 'Al', tags: ['x'] } });
    });
  });
});
