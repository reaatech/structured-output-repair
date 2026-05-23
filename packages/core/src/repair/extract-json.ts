/**
 * Extracts the first balanced JSON object or array embedded in surrounding
 * prose. LLMs frequently wrap output in explanation, e.g.
 * `Sure! Here is the JSON you asked for: {"ok": true}. Let me know!`.
 *
 * Scanning is string-aware so braces/brackets inside string values are not
 * counted. If no opening delimiter is found the input is returned unchanged,
 * making this a safe no-op for already-clean JSON. If a delimiter is found
 * but never closed (truncated output), everything from the first delimiter to
 * the end is returned so downstream truncation repair can finish the job.
 */
export function extractJson(input: string): string {
  const objStart = input.indexOf('{');
  const arrStart = input.indexOf('[');

  let start = -1;
  if (objStart === -1) start = arrStart;
  else if (arrStart === -1) start = objStart;
  else start = Math.min(objStart, arrStart);

  if (start === -1) return input;

  const open = input[start];
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  // Opening delimiter found but never balanced — likely truncated output.
  return input.slice(start);
}
