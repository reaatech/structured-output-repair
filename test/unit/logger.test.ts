import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '../../src/utils/logger.js';

describe('createLogger', () => {
  it('should not log when disabled', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger(false);
    logger.debug('test message');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log when enabled', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger(true);
    logger.debug('test message', 1, 2);
    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0]![0]).toContain('test message');
    expect(consoleSpy.mock.calls[0]![1]).toBe(1);
    expect(consoleSpy.mock.calls[0]![2]).toBe(2);
    consoleSpy.mockRestore();
  });
});
