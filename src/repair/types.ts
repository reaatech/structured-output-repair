import type { z } from 'zod';

export type RepairStrategyName =
  | 'strip-fences'
  | 'fix-json-syntax'
  | 'coerce-types'
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

export interface RepairResult<T> {
  success: boolean;
  data: T | null;
  originalInput: string;
  repairedInput?: string;
  steps: RepairStep[];
  errors: RepairError[];
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
