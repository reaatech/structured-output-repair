export interface Logger {
  debug(message: string, ...args: unknown[]): void;
}

export function createLogger(enabled: boolean): Logger {
  return {
    debug(message: string, ...args: unknown[]): void {
      if (enabled) {
        // eslint-disable-next-line no-console
        console.error(`[structured-output-repair] ${message}`, ...args);
      }
    },
  };
}
