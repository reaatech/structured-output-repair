/**
 * Repairs common JSON syntax errors found in LLM output.
 */
export function fixJsonSyntax(input: string): string {
  let result = input;

  // Remove single-line comments
  result = result.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Convert single-quoted strings to double-quoted
  result = replaceSingleQuotes(result);

  // Quote unquoted object keys
  result = quoteUnquotedKeys(result);

  // Normalize non-JSON literals (NaN/Infinity/undefined, Python True/False/None)
  // and insert missing commas between adjacent values — string-aware so it
  // never touches the contents of string values.
  result = normalizeLiteralsAndCommas(result);

  // Fix trailing commas
  result = removeTrailingCommas(result);

  // Close truncated/cut-off output (unterminated strings, dangling separators)
  result = fixTruncation(result);

  // Balance braces and brackets
  result = balanceBrackets(result);

  return result.trim();
}

/**
 * Bare-word tokens that are not valid JSON and their JSON equivalents.
 * Covers JavaScript (`NaN`, `Infinity`, `undefined`) and Python (`True`,
 * `False`, `None`) literals that LLMs frequently emit.
 */
const LITERAL_REPLACEMENTS: Record<string, string> = {
  NaN: 'null',
  Infinity: 'null',
  '-Infinity': 'null',
  undefined: 'null',
  True: 'true',
  False: 'false',
  None: 'null',
};

/** A token is a JSON value-start if a preceding value implies a missing comma. */
function isJsonValueToken(token: string): boolean {
  if (token === 'true' || token === 'false' || token === 'null') return true;
  return /^-?\d/.test(token);
}

function replaceSingleQuotes(input: string): string {
  let result = '';
  let inString = false;
  let stringChar: string | null = null;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      result += '"';
      continue;
    }

    if (inString && char === stringChar) {
      inString = false;
      stringChar = null;
      result += '"';
      continue;
    }

    // If we're inside a single-quoted string, escape any double quotes inside
    if (inString && stringChar === "'" && char === '"') {
      result += '\\"';
      continue;
    }

    result += char;
  }

  // If still in string, close it
  if (inString) {
    result += '"';
  }

  return result;
}

function quoteUnquotedKeys(input: string): string {
  // Match unquoted keys in objects: key: or key :
  // Be careful not to match values that look like keys inside strings
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString && /[a-zA-Z_$]/.test(char)) {
      // Check if this looks like an unquoted key followed by colon (possibly with whitespace)
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_$]/.test(input[j])) {
        j++;
      }
      const key = input.slice(i, j);
      // Look ahead for colon, skipping whitespace
      let k = j;
      while (k < input.length && /\s/.test(input[k])) {
        k++;
      }
      if (k < input.length && input[k] === ':') {
        result += `"${key}"`;
        i = j - 1;
        continue;
      }
    }

    result += char;
  }

  return result;
}

/**
 * String-aware single pass that (1) normalizes non-JSON literals to their
 * JSON equivalents and (2) inserts missing commas between adjacent values.
 * Contents of string values are copied verbatim and never inspected, so it
 * cannot corrupt data that merely looks like JSON syntax.
 */
function normalizeLiteralsAndCommas(input: string): string {
  let result = '';
  // Whether the previous emitted, non-whitespace token can end a value
  // (a closing brace/bracket, a string, a number, or a literal).
  let valueEnd = false;
  let ws = '';

  for (let i = 0; i < input.length; ) {
    const char = input[i];

    if (/\s/.test(char)) {
      ws += char;
      i++;
      continue;
    }

    // Strings: copy through verbatim, honoring escapes.
    if (char === '"') {
      if (valueEnd && ws.length > 0) {
        result += ', ';
      } else {
        result += ws;
      }
      ws = '';
      result += char;
      i++;
      let escaped = false;
      while (i < input.length) {
        const c = input[i];
        result += c;
        i++;
        if (escaped) {
          escaped = false;
        } else if (c === '\\') {
          escaped = true;
        } else if (c === '"') {
          break;
        }
      }
      valueEnd = true;
      continue;
    }

    // Structural characters.
    if (char === '{' || char === '[') {
      if (valueEnd && ws.length > 0) {
        result += ', ';
      } else {
        result += ws;
      }
      ws = '';
      result += char;
      valueEnd = false;
      i++;
      continue;
    }
    if (char === '}' || char === ']') {
      result += ws;
      ws = '';
      result += char;
      valueEnd = true;
      i++;
      continue;
    }
    if (char === ',' || char === ':') {
      result += ws;
      ws = '';
      result += char;
      valueEnd = false;
      i++;
      continue;
    }

    // Bare-word / number token: read it whole, then normalize.
    let j = i;
    if (char === '-' || char === '+' || /\d/.test(char)) {
      while (j < input.length && /[-+0-9.eE]/.test(input[j])) j++;
    } else {
      while (j < input.length && /[A-Za-z0-9_$]/.test(input[j])) j++;
    }
    let token = input.slice(i, j);
    if (token.length === 0) {
      // Unrecognized character — emit as-is and reset state conservatively.
      result += ws;
      ws = '';
      result += char;
      valueEnd = false;
      i++;
      continue;
    }

    // Handle the two-char `-Infinity` token before falling back to the map.
    if (token === '-Infinity') {
      token = 'null';
    } else if (token in LITERAL_REPLACEMENTS) {
      token = LITERAL_REPLACEMENTS[token];
    }

    const startsValue = isJsonValueToken(token);
    if (valueEnd && ws.length > 0 && startsValue) {
      result += ', ';
    } else {
      result += ws;
    }
    ws = '';
    result += token;
    valueEnd = startsValue;
    i = j;
  }

  result += ws;
  return result;
}

/**
 * Repairs output that was cut off mid-stream: closes an unterminated string
 * and drops a dangling trailing separator so the structural balancer can
 * finish the job. Operates only on the tail of the input.
 */
function fixTruncation(input: string): string {
  let result = input;

  // Close an unterminated string (odd number of unescaped quotes).
  let inString = false;
  let escaped = false;
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    }
  }
  if (inString) {
    result += '"';
  }

  // Resolve a dangling trailing separator left by truncation.
  const trimmedEnd = result.replace(/\s+$/, '');
  if (trimmedEnd.endsWith(',')) {
    // `{"a":1,` / `[1,` — drop the trailing comma.
    result = trimmedEnd.slice(0, -1);
  } else if (trimmedEnd.endsWith(':')) {
    // `{"a":` — key with no value; supply null so the object stays valid.
    result = `${trimmedEnd}null`;
  }

  return result;
}

function removeTrailingCommas(input: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString && char === ',') {
      // Look ahead to find next non-whitespace
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j++;
      }
      const next = j < input.length ? input[j] : undefined;
      if (next === '}' || next === ']') {
        // Skip this comma (trailing)
        continue;
      }
    }

    result += char;
  }

  return result;
}

function balanceBrackets(input: string): string {
  // Track open delimiters on a stack so missing closers are emitted in the
  // correct nesting order (innermost first) — e.g. a truncated `{"a":[1`
  // closes as `]}`, not `}]`.
  const stack: Array<'{' | '['> = [];
  let prefix = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}') {
      if (stack[stack.length - 1] === '{') {
        stack.pop();
      } else {
        // Surplus closer — prepend a matching opener at the start.
        prefix = `{${prefix}`;
      }
    } else if (char === ']') {
      if (stack[stack.length - 1] === '[') {
        stack.pop();
      } else {
        prefix = `[${prefix}`;
      }
    }
  }

  let suffix = '';
  for (let i = stack.length - 1; i >= 0; i--) {
    suffix += stack[i] === '{' ? '}' : ']';
  }

  return prefix + input + suffix;
}
