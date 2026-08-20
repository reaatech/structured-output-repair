import { defineConfig } from 'vitest/config';

const sharedTest = {
  globals: false,
  environment: 'node',
  include: ['src/**/*.test.ts'],
} as const;

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json-summary'],
    },
    // The full suite runs twice: once against zod 3 (the installed peer) and
    // once against zod 4 via the `zod4` aliased devDependency
    // (`zod4: npm:zod@^4`). Both runs must stay green.
    projects: [
      {
        test: {
          name: 'zod3',
          ...sharedTest,
        },
      },
      {
        resolve: {
          alias: {
            zod: 'zod4',
          },
        },
        test: {
          name: 'zod4',
          ...sharedTest,
        },
      },
    ],
  },
});
