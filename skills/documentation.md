# Skill: Documentation

**Category**: Technical Writing
**Difficulty**: Intermediate
**Estimated Time**: 1-3 hours per document

## Overview

This skill covers creating and maintaining comprehensive documentation for the structured-output-repair monorepo, including per-package READMEs, root README, architecture docs, and inline code comments.

## Capabilities

An AI agent with this skill can:

1. **Write Package READMEs** (`packages/*/README.md`)
   - Scoped package name as H1, badges (npm version, License, CI)
   - Status blockquote, feature overview, installation
   - Quick Start with runnable code examples
   - API Reference with tables for options, return types, error classes
   - Usage Patterns section with multiple examples
   - Related Packages section linking to other packages in the monorepo

2. **Write Root README**
   - Project name, badges (CI, License, TypeScript)
   - Elevator pitch, features list
   - Installation (packages + contributing)
   - Quick Start, Packages table, Repair Strategies table
   - Documentation links

3. **Create Architecture Documentation** (`ARCHITECTURE.md`)
   - Package boundary ASCII diagram
   - Data flow diagrams for repair pipeline and MCP tool flow
   - State machine diagram
   - Technology choices table
   - Extension points

4. **Add Inline Documentation**
   - JSDoc comments for all public APIs
   - Import patterns and module-level comments
   - Biome-ignore comments with rationale for intentional rule violations

5. **Create Additional Documentation**
   - `CONTRIBUTING.md` — Contribution guidelines
   - `AGENTS.md` — AI agent development guide

## When to Use This Skill

- After implementing new features
- When creating a new package in the monorepo
- Before releasing a new version
- When updating existing documentation
- When adding new examples or tutorials

## Example Requests

```
"Write a comprehensive README for @reaatech/structured-repair-core"

"Add JSDoc comments to the repair() function with examples"

"Create usage examples for common LLM output repair scenarios"

"Document the MCP tool setup and configuration"

"Update the root README with the current package list"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] READMEs following the exact format used by `a2a-reference-ts` packages
- [ ] All public APIs documented with JSDoc
- [ ] Working code examples that can be copy-pasted
- [ ] Proper markdown formatting
- [ ] Consistent terminology across all docs
- [ ] Links to related resources and packages

## Dependencies

This skill requires:
- Implementation skill completed (code to document)
- Understanding of the project's purpose and audience
- Knowledge of markdown formatting
- Familiarity with JSDoc syntax

## README Format (per A2A convention)

Every package README follows this exact structure:

```markdown
# @reaatech/structured-repair-<name>

[![npm version](https://img.shields.io/npm/v/@reaatech/structured-repair-<name>.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](...)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/structured-output-repair/ci.yml?branch=main&label=CI)](...)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

One-line description of the package.

## Installation

```bash
npm install @reaatech/structured-repair-<name>
pnpm add @reaatech/structured-repair-<name>
```

## Feature Overview

- **Feature 1** — Description
- **Feature 2** — Description

## Quick Start

```typescript
// Runnable code example
```

## API Reference

### `functionName()`

| Property | Type | Default | Description |
|----------|------|---------|-------------|

## Usage Patterns

### Pattern Name

```typescript
// Example
```

## Related Packages

- [`@reaatech/structured-repair-<other>`](https://www.npmjs.com/package/...) — Description

## License

[MIT](...)
```

## Documentation Best Practices

1. **Match A2A Convention** — Use the exact same sections, badge format, and table style
2. **Show, Don't Just Tell** — Runnable code examples for every exported function
3. **Be Concise** — Get to the point quickly
4. **Tables for Reference** — Use tables for options, return types, and error classes
5. **Keep It Updated** — READMEs should match the current code
6. **Cross-Reference** — Link to related packages, docs, and resources

## Documentation Checklist

Before finalizing any README:

- [ ] Badges functional (npm version, license, CI status)
- [ ] All npm install commands correct (scoped package names)
- [ ] Quick Start example compiles and runs
- [ ] API Reference covers all public exports
- [ ] Options/return types match the actual TypeScript types
- [ ] Related Packages section links to sibling packages
- [ ] LICENSE link resolves correctly

## Troubleshooting

### Issue: npm badge shows incorrect version
- **Solution**: Verify the badge URL uses the exact npm package name

### Issue: Code examples out of date with API
- **Solution**: Cross-reference JSDoc types in the source; update examples to match

### Issue: Missing sections compared to sibling packages
- **Solution**: Use the template above; compare against `packages/core/README.md` as the reference

## Resources

- [a2a-reference-ts READMEs](https://github.com/reaatech/a2a-reference-ts/tree/main/packages) — Reference implementation
- [JSDoc Documentation](https://jsdoc.app/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Shields.io](https://shields.io/) — Badge generation

## Related Skills

- [`implementation.md`](./implementation.md) — Core library implementation
- [`mcp.md`](./mcp.md) — MCP tool documentation
- [`testing.md`](./testing.md) — Test documentation within test files
