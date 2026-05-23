import type { z } from 'zod';
import { UnrepairableError } from '../utils/errors.js';
import { createLogger } from '../utils/logger.js';
import { coerceTypes } from './coerce-types.js';
import { extractJson } from './extract-json.js';
import { fixJsonSyntax } from './fix-json.js';
import { fuzzyMatchKeys } from './fuzzy-match-keys.js';
import { removeExtraFields } from './remove-extra-fields.js';
import { stripFences } from './strip-fences.js';
import type {
  FieldError,
  InputAnalysis,
  InputIssue,
  RepairError,
  RepairFailureContext,
  RepairOptions,
  RepairResult,
  RepairStep,
  RepairStrategyName,
} from './types.js';

export { coerceTypes, makeCoercedSchema } from './coerce-types.js';
export { extractJson } from './extract-json.js';
export { fixJsonSyntax } from './fix-json.js';
export { fuzzyMatchKeys } from './fuzzy-match-keys.js';
export { removeExtraFields } from './remove-extra-fields.js';
export { stripFences } from './strip-fences.js';
export * from './types.js';

const DEFAULT_STRATEGIES: RepairStrategyName[] = [
  'strip-fences',
  'extract-json',
  'fix-json-syntax',
  'coerce-types',
  'fuzzy-match-keys',
  'remove-extra-fields',
];

const STRING_STRATEGIES: Map<RepairStrategyName, (input: string) => string> = new Map([
  ['strip-fences', stripFences],
  ['extract-json', extractJson],
  ['fix-json-syntax', fixJsonSyntax],
]);

const OBJECT_STRATEGIES: Map<RepairStrategyName, (schema: z.ZodType, data: unknown) => unknown> =
  new Map([
    ['coerce-types', coerceTypes],
    ['fuzzy-match-keys', fuzzyMatchKeys],
    ['remove-extra-fields', removeExtraFields],
  ]);

/**
 * Attempts to repair malformed LLM output against a Zod schema.
 * Applies strategies in order and returns detailed result information.
 */
export function repairOutput<T extends z.ZodType>(
  options: RepairOptions<T>,
): RepairResult<z.infer<T>> {
  const { schema, input, debug = false, strategies = DEFAULT_STRATEGIES, onFailure } = options;

  const logger = createLogger(debug);
  const steps: RepairStep[] = [];
  const errors: RepairError[] = [];
  let currentInput = input;

  logger.debug('Starting repair', { inputLength: input.length, strategies });

  // Phase 1: String-based strategies
  for (const strategyName of strategies) {
    const stringStrategy = STRING_STRATEGIES.get(strategyName);
    if (!stringStrategy) continue;

    const before = currentInput;
    try {
      currentInput = stringStrategy(currentInput);
      steps.push({
        strategy: strategyName,
        success: true,
        inputBefore: before,
        outputAfter: currentInput,
      });
      logger.debug(`Strategy ${strategyName} succeeded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ code: 'STRATEGY_FAILED', message, strategy: strategyName });
      steps.push({
        strategy: strategyName,
        success: false,
        inputBefore: before,
        outputAfter: currentInput,
        error: message,
      });
      logger.debug(`Strategy ${strategyName} failed: ${message}`);
    }
  }

  // Phase 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(currentInput);
    logger.debug('JSON parsed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ code: 'JSON_PARSE_FAILED', message });
    logger.debug(`JSON parse failed: ${message}`);

    const failureContext: RepairFailureContext = {
      originalInput: input,
      lastAttempt: currentInput,
      errors,
      steps,
    };

    if (onFailure) {
      onFailure(failureContext);
    }

    logger.debug('Repair failed — JSON could not be parsed');

    return {
      success: false,
      data: null,
      originalInput: input,
      repairedInput: currentInput,
      steps,
      errors,
    };
  }

  // Phase 3: Validate as-is first
  const directResult = schema.safeParse(parsed);
  if (directResult.success) {
    logger.debug('Direct validation succeeded');
    return {
      success: true,
      data: directResult.data,
      originalInput: input,
      repairedInput: currentInput,
      steps,
      errors,
    };
  }

  // Phase 4: Object-based strategies (loop until stable or success)
  let currentData = parsed;
  let objectChanged = true;
  let objectAttempts = 0;
  const maxObjectAttempts = 3;

  while (objectChanged && objectAttempts < maxObjectAttempts) {
    objectChanged = false;
    objectAttempts++;

    for (const strategyName of strategies) {
      const objectStrategy = OBJECT_STRATEGIES.get(strategyName);
      if (!objectStrategy) continue;

      const before = JSON.stringify(currentData);
      try {
        const newData = objectStrategy(schema, currentData);
        const after = JSON.stringify(newData);
        if (after !== before) {
          objectChanged = true;
          currentData = newData;
          steps.push({
            strategy: strategyName,
            success: true,
            inputBefore: before,
            outputAfter: after,
          });
          logger.debug(`Strategy ${strategyName} modified data`);

          // Try validating after each successful modification
          const validationResult = schema.safeParse(currentData);
          if (validationResult.success) {
            logger.debug(`Validation succeeded after ${strategyName}`);
            return {
              success: true,
              data: validationResult.data,
              originalInput: input,
              repairedInput: after,
              steps,
              errors,
            };
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ code: 'STRATEGY_FAILED', message, strategy: strategyName });
        steps.push({
          strategy: strategyName,
          success: false,
          inputBefore: before,
          outputAfter: JSON.stringify(currentData),
          error: message,
        });
        logger.debug(`Strategy ${strategyName} failed: ${message}`);
      }
    }
  }

  const failureContext: RepairFailureContext = {
    originalInput: input,
    lastAttempt: currentInput,
    errors,
    steps,
  };

  if (onFailure) {
    onFailure(failureContext);
  }

  logger.debug('Repair failed after all attempts');

  // Surface best-effort partial data and per-field validation errors so the
  // caller can recover partially or pinpoint what is wrong.
  const finalValidation = schema.safeParse(currentData);
  const fieldErrors = finalValidation.success ? undefined : toFieldErrors(finalValidation.error);

  return {
    success: false,
    data: null,
    originalInput: input,
    repairedInput: currentInput,
    steps,
    errors,
    partialData: currentData,
    fieldErrors,
  };
}

/** Formats a Zod issue path as a dot/bracket string, e.g. `address.zip` or `tags[0]`. */
function formatPath(path: ReadonlyArray<string | number>): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else {
      out += out.length > 0 ? `.${segment}` : segment;
    }
  }
  return out;
}

/** Maps a ZodError's issues to the lightweight FieldError shape used in results. */
function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
  }));
}

/**
 * Quick repair function that throws UnrepairableError on failure.
 *
 * Returns a Promise even though the current repair pipeline is synchronous:
 * the async signature is intentional so future async strategies (e.g. an
 * LLM-assisted repair pass) can be added without a breaking API change.
 */
export async function repair<T extends z.ZodType>(schema: T, input: string): Promise<z.infer<T>> {
  const result = repairOutput({ schema, input });
  if (!result.success) {
    throw new UnrepairableError('Input could not be repaired', input, result.steps);
  }
  return result.data;
}

/**
 * Check if input is valid against the schema without repair.
 */
export function isValid<T extends z.ZodType>(schema: T, input: string): boolean {
  try {
    const parsed = JSON.parse(input);
    return schema.safeParse(parsed).success;
  } catch {
    return false;
  }
}

/**
 * Analyze input for common issues without applying repairs.
 */
export function analyzeInput(input: string): InputAnalysis {
  const issues: InputIssue[] = [];

  // Check for fences
  const hasFences = /^`{3,}/.test(input.trim());
  if (hasFences) {
    issues.push({
      type: 'fence-wrapper',
      description: 'Input is wrapped in markdown code fences',
    });
  }

  let cleaned = input;
  if (hasFences) {
    cleaned = stripFences(input);
  }

  // Try parsing
  let isValidJson = false;
  try {
    JSON.parse(cleaned);
    isValidJson = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Heuristic issue detection based on error message
    if (message.includes('trailing comma') || /,\s*[}\]]/.test(cleaned)) {
      issues.push({ type: 'trailing-comma', description: 'Trailing comma detected' });
    }
    if (message.includes('Unexpected token') && /'/.test(cleaned)) {
      issues.push({ type: 'single-quote', description: 'Possible single quotes used' });
    }
    if (message.includes('Unexpected token') && /[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(cleaned)) {
      issues.push({ type: 'unquoted-key', description: 'Possible unquoted object keys' });
    }
    if (message.includes('Unexpected string') || message.includes('Unexpected token')) {
      issues.push({ type: 'missing-comma', description: 'Possible missing comma between values' });
    }
    if (message.includes('Unexpected end')) {
      const openBraces = (cleaned.match(/{/g) || []).length;
      const closeBraces = (cleaned.match(/}/g) || []).length;
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/]/g) || []).length;
      if (openBraces > closeBraces) {
        issues.push({ type: 'missing-brace', description: 'Missing closing brace(s)' });
      }
      if (openBrackets > closeBrackets) {
        issues.push({ type: 'missing-bracket', description: 'Missing closing bracket(s)' });
      }
    }
    if (/\bNaN\b|\bInfinity\b|\bundefined\b/.test(cleaned)) {
      issues.push({
        type: 'invalid-value',
        description: 'Invalid JSON values detected (NaN, Infinity, undefined)',
      });
    }
  }

  return { isValidJson, issues, hasFences };
}
