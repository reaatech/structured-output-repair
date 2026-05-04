# @reaatech/structured-repair-core

## 2.0.0

### Major Changes

- [#13](https://github.com/reaatech/structured-output-repair/pull/13) [`a91a01b`](https://github.com/reaatech/structured-output-repair/commit/a91a01b6ef225068b7019a48116e0ab55c54a02b) Thanks [@reaatech](https://github.com/reaatech)! - Initial release of structured-output-repair — a library that catches malformed LLM
  structured outputs and fixes them instead of crashing.

  - `@reaatech/structured-repair-core`: Core repair engine with 4 graduated strategies
    (strip-fences, fix-json-syntax, coerce-types, remove-extra-fields)
  - `@reaatech/structured-repair-mcp`: MCP server exposing repair functionality as tools
