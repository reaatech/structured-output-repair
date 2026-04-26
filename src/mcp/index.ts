#!/usr/bin/env node

import { startServer } from './server.js';

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
