---
"@reaatech/structured-repair-core": minor
"@reaatech/structured-repair-mcp": minor
---

Expand repair functionality and JSON Schema support.

Core:
- New `extract-json` strategy pulls JSON out of conversational prose (string-aware, also recovers truncated tails).
- New `fuzzy-match-keys` strategy remaps hallucinated/misnamed keys to schema keys by case/separator (`e-mail` → `email`, `first_name` → `firstName`).
- `fix-json-syntax` now normalizes Python literals (`True`/`False`/`None`), repairs truncated/cut-off output (unterminated strings, dangling separators), and balances delimiters in correct nesting order.
- `fixMissingCommas` and literal normalization are now string-aware and can no longer corrupt string contents.
- `RepairResult` includes best-effort `partialData` and per-field `fieldErrors` (with dot/bracket paths) on failure.

MCP:
- `jsonSchemaToZod` now supports `anyOf`/`oneOf`/`allOf`, `$ref`/`$defs`/`definitions` (including recursive refs), `const`, `default`, nullable `type` arrays, string `format` (email/uri/url/uuid/date-time), `additionalProperties`, tuples, and implicit objects.
