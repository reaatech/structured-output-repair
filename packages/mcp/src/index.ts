#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createStructuredRepairServer, startServer } from './server.js';
import { jsonSchemaToZod } from './utils.js';

export { createStructuredRepairServer, jsonSchemaToZod, startServer };

// Auto-start server when executed directly as a CLI binary (not when imported as a library)
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
