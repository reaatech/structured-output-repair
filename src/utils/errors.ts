import type { ZodError } from 'zod';
import type { RepairStep } from '../repair/types.js';

export class StructuredRepairError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StructuredRepairError';
  }
}

export class UnrepairableError extends StructuredRepairError {
  constructor(
    message: string,
    public originalInput: string,
    public attempts: RepairStep[]
  ) {
    super(message, 'UNREPAIRABLE', { originalInput, attempts });
    this.name = 'UnrepairableError';
  }
}

export class SchemaMismatchError extends StructuredRepairError {
  constructor(
    message: string,
    public zodError: ZodError
  ) {
    super(message, 'SCHEMA_MISMATCH', { zodError: zodError.format() });
    this.name = 'SchemaMismatchError';
  }
}

export class JsonSyntaxError extends StructuredRepairError {
  constructor(
    message: string,
    public position?: number,
    public line?: number,
    public column?: number
  ) {
    super(message, 'JSON_SYNTAX_ERROR', { position, line, column });
    this.name = 'JsonSyntaxError';
  }
}
