# AGENTS.md — AI Agent Development Guide

Welcome to **structured-output-repair**! This document provides guidance for AI agents assisting with development of this project.

## Project Overview

This is a **pnpm workspace monorepo** managed with Turborepo.

**structured-output-repair** is a TypeScript library that catches malformed LLM structured outputs and fixes them instead of crashing. It ships as both an npm library and an MCP tool (`structured.repair`).

- **GitHub**: [reaatech/structured-output-repair](https://github.com/reaatech/structured-output-repair)
- **License**: MIT
- **Tech Stack**: TypeScript, pnpm, Zod, tsup, Vitest, Biome, Turbo, Changesets, MCP SDK

## Project Structure

```
packages/
  core/         — Repair engine, all 6 strategies, types, errors, logger
  mcp/          — MCP server tool (depends on core)
```

### Core Package (`packages/core/`)

```
packages/core/src/
  index.ts                          — Public API barrel (repair, repairOutput, isValid, analyzeInput)
  repair/
    index.ts                        — Pipeline orchestrator + strategy registry
    types.ts                        — RepairOptions<T>, RepairResult<T>, RepairStep, FieldError, RepairStrategyName
    strip-fences.ts                 — Strategy 1: markdown fence removal
    extract-json.ts                 — Strategy 2: extract JSON from surrounding prose (string-aware)
    fix-json.ts                     — Strategy 3: JSON syntax repair (incl. Python literals + truncation)
    coerce-types.ts                 — Strategy 4: Zod type coercion (walks Zod internals)
    fuzzy-match-keys.ts             — Strategy 5: remap misnamed keys to schema keys
    remove-extra-fields.ts          — Strategy 6: hallucinated field removal (recursive)
  types/index.ts                    — Type re-exports
  utils/
    errors.ts                       — StructuredRepairError, UnrepairableError, etc.
    logger.ts                       — Debug logger (writes to stderr)
```

### MCP Package (`packages/mcp/`)

```
packages/mcp/src/
  index.ts          — Binary entry (#!/usr/bin/env node)
  server.ts         — MCP server, structured.repair + structured.analyze tools
  utils.ts          — JSON Schema → Zod converter
```

## Build System

- **Package manager:** pnpm (required)
- **Build tool:** tsup (per-package) + Turborepo (orchestration)
- **Format/Lint:** Biome (not Prettier/ESLint)
- **Test:** Vitest
- **Release:** Changesets
- **TypeScript:** Strict mode, ESM + CJS dual output

### Common Commands

```bash
# Install all dependencies
pnpm install

# Build everything
pnpm build

# Run all tests
pnpm test

# Lint & format
pnpm lint
pnpm lint:fix
pnpm format

# Type-check without emit
pnpm typecheck
```

## Coding Conventions

1. **Runtime validation:** Use Zod for all external-facing data. Never trust raw JSON from LLMs.
2. **Logging:** Use `createLogger()` from `packages/core/src/utils/logger.ts`. Never `console.log` in library code — use `console.error` only for MCP binary lifecycle messages.
3. **Error handling:** Use typed `StructuredRepairError` subclasses from `packages/core/src/utils/errors.ts`. Include error codes.
4. **Types:** Prefer `type` over `interface` for data shapes. Keep `interface` for class contracts.
5. **No `any`:** Biome is configured to error on `any`. Use `unknown` + narrowing instead. For unavoidable Zod internal access (`_def.shape`, `_def.options`), use `// biome-ignore lint/suspicious/noExplicitAny: accessing Zod internals`.
6. **Exports:** Always provide ESM + CJS dual output with `types` condition first in `exports`.
7. **Tests:** Colocated as `src/*.test.ts`. Import vitest explictly (`import { describe, it, expect } from 'vitest'`). No globals.
8. **Imports:** Within a package, use relative `.js` extension imports. Cross-package imports use the scoped package name (`@reaatech/structured-repair-core`).

### How to format / lint

```bash
pnpm format      # biome format --write .
pnpm lint        # biome check .
pnpm lint:fix    # biome check --write .
```

## How AI Agents Can Help

AI agents can assist with various aspects of development. See the `skills/` directory for specific skill definitions:

| Skill | Description |
|-------|-------------|
| [`skills/setup.md`](./skills/setup.md) | Project initialization, dependency installation, environment setup |
| [`skills/implementation.md`](./skills/implementation.md) | Core library implementation, repair strategies, API development |
| [`skills/testing.md`](./skills/testing.md) | Unit tests, integration tests, test coverage, edge cases |
| [`skills/documentation.md`](./skills/documentation.md) | README, API docs, examples, inline comments |
| [`skills/mcp.md`](./skills/mcp.md) | MCP server implementation, tool definitions, binary setup |
| [`skills/ci-cd.md`](./skills/ci-cd.md) | GitHub Actions, automated testing, Changesets publishing |

## Agent Guidelines

### 1. Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types in public API
- **Formatting**: Biome with project defaults (single quotes, trailing commas, 2-space indent)
- **Linting**: Biome with recommended rules, `noExplicitAny: error`, `noNonNullAssertion: error`
- **Testing**: Unit tests colocated as `src/*.test.ts`. Coverage thresholds enforced.
- **Documentation**: All public APIs must have JSDoc comments

### 2. Development Workflow

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format
```

### 3. Git Workflow

- Main branch: `main`
- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Commits should be descriptive and follow conventional commits

### 4. Before Submitting Changes

- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] New features have tests
- [ ] Documentation is updated

## Adding a New Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Use `@reaatech/structured-repair-core` for shared types. Do not duplicate schemas.
3. Run `pnpm install` to link workspace dependencies

## Requesting Agent Assistance

When requesting help from an AI agent, please:

1. **Be specific** about what you need
2. **Reference the relevant skill** file if applicable
3. **Provide context** about the current state
4. **Specify constraints** or requirements

## Key Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System-level design and data flow
- [skills/](./skills/) — Agent skill definitions
- [Zod Documentation](https://zod.dev/) — Schema validation library
- [MCP SDK Docs](https://github.com/modelcontextprotocol/typescript-sdk) — MCP implementation

## License

MIT License — See [LICENSE](./LICENSE) file for details.
