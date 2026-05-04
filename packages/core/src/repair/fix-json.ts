/**
 * Repairs common JSON syntax errors found in LLM output.
 */
export function fixJsonSyntax(input: string): string {
  let result = input;

  // Remove single-line comments
  result = result.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Replace invalid JSON values
  result = result.replace(/\bNaN\b/g, 'null');
  result = result.replace(/\bInfinity\b/g, 'null');
  result = result.replace(/\b-Infinity\b/g, 'null');
  result = result.replace(/\bundefined\b/g, 'null');

  // Convert single-quoted strings to double-quoted
  result = replaceSingleQuotes(result);

  // Quote unquoted object keys
  result = quoteUnquotedKeys(result);

  // Fix missing commas between values
  result = fixMissingCommas(result);

  // Fix trailing commas
  result = removeTrailingCommas(result);

  // Balance braces and brackets
  result = balanceBrackets(result);

  return result.trim();
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

function fixMissingCommas(input: string): string {
  let result = input;
  result = result.replace(/([}\]"0-9]|true|false|null)\s+(["{\[])/g, '$1, $2');
  result = result.replace(/([}\]"0-9]|true|false|null)\s+(true|false|null|-?\d)/g, '$1, $2');

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
  let braceCount = 0;
  let bracketCount = 0;
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

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
    } else if (char === '[') {
      bracketCount++;
    } else if (char === ']') {
      bracketCount--;
    }
  }

  let result = input;
  while (braceCount < 0) {
    result = `{${result}`;
    braceCount++;
  }
  while (bracketCount < 0) {
    result = `[${result}`;
    bracketCount++;
  }
  while (braceCount > 0) {
    result += '}';
    braceCount--;
  }
  while (bracketCount > 0) {
    result += ']';
    bracketCount--;
  }

  return result;
}
