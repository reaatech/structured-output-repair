/**
 * Removes markdown code fence wrappers from LLM output.
 * Handles ```json, ```javascript, ```typescript, ```, and nested fences.
 */
export function stripFences(input: string): string {
  let result = input.trim();

  let changed = true;
  while (changed) {
    changed = false;

    const openMatch = result.match(/^(`{3,})(?:json|javascript|typescript|js|ts)?\s*(\n?)/i);
    if (!openMatch) continue;

    const fenceLen = openMatch[1]?.length;
    const hadNewline = openMatch[2] === '\n';

    const closingPattern = hadNewline
      ? new RegExp(`\\n${'`'.repeat(fenceLen)}\\s*$`, 'i')
      : new RegExp(`${'`'.repeat(fenceLen)}\\s*$`, 'i');

    if (!closingPattern.test(result)) continue;

    result = result.slice(openMatch[0].length);
    result = result.replace(closingPattern, '');
    result = result.trim();
    changed = true;
  }

  return result.trim();
}
