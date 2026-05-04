---
"@reaatech/structured-repair-core": major
"@reaatech/structured-repair-mcp": major
---

Initial release of structured-output-repair — a library that catches malformed LLM
structured outputs and fixes them instead of crashing.

- `@reaatech/structured-repair-core`: Core repair engine with 4 graduated strategies
  (strip-fences, fix-json-syntax, coerce-types, remove-extra-fields)
- `@reaatech/structured-repair-mcp`: MCP server exposing repair functionality as tools
