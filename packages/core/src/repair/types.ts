import type { z } from 'zod';

export type RepairStrategyName =
  | 'strip-fences'
  | 'extract-json'
  | 'fix-json-syntax'
  | 'coerce-types'
  | 'fuzzy-match-keys'
  | 'remove-extra-fields';

export interface RepairError {
  code: string;
  message: string;
  strategy?: string;
}

export interface RepairStep {
  strategy: string;
  success: boolean;
  inputBefore: string;
  outputAfter: string;
  error?: string;
}

export interface RepairOptions<T extends z.ZodType = z.ZodType> {
  schema: T;
  input: string;
  debug?: boolean;
  strategies?: RepairStrategyName[];
  onFailure?: (context: RepairFailureContext) => void;
}

export interface FieldError {
  /** Dot/bracket path to the offending field, e.g. `address.zip` or `tags[0]`. */
  path: string;
  message: string;
}

export interface RepairResult<T> {
  success: boolean;
  data: T | null;
  originalInput: string;
  repairedInput?: string;
  steps: RepairStep[];
  errors: RepairError[];
  /**
   * Best-effort data when repair fails after JSON was successfully parsed.
   * Contains the most-repaired value that still failed schema validation —
   * useful for partial recovery and debugging. `undefined` if parsing failed.
   */
  partialData?: unknown;
  /**
   * Per-field schema validation errors from the final failed validation
   * attempt. Populated only on failure when JSON parsed successfully.
   */
  fieldErrors?: FieldError[];
}

export interface RepairFailureContext {
  originalInput: string;
  lastAttempt: string;
  errors: RepairError[];
  steps: RepairStep[];
}

export interface InputIssue {
  type:
    | 'trailing-comma'
    | 'missing-brace'
    | 'missing-bracket'
    | 'unquoted-key'
    | 'single-quote'
    | 'missing-comma'
    | 'invalid-value'
    | 'fence-wrapper';
  description: string;
}

export interface InputAnalysis {
  isValidJson: boolean;
  issues: InputIssue[];
  hasFences: boolean;
}
