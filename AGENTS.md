# AGENTS.md — AI Agent Development Guide

Welcome to **structured-output-repair**! This document provides guidance for AI agents assisting with development of this project.

## Project Overview

**structured-output-repair** is a TypeScript library that catches malformed LLM structured outputs and fixes them instead of crashing. It ships as both an npm library and an MCP tool (`structured.repair`).

- **GitHub**: [reaatech/structured-output-repair](https://github.com/reaatech/structured-output-repair)
- **License**: MIT
- **Tech Stack**: TypeScript, pnpm, Zod, tsup, Vitest, MCP SDK

## How AI Agents Can Help

AI agents can assist with various aspects of development. See the `skills/` directory for specific skill definitions:

| Skill | Description |
|-------|-------------|
| [`skills/setup.md`](./skills/setup.md) | Project initialization, dependency installation, environment setup |
| [`skills/implementation.md`](./skills/implementation.md) | Core library implementation, repair strategies, API development |
| [`skills/testing.md`](./skills/testing.md) | Unit tests, integration tests, test coverage, edge cases |
| [`skills/documentation.md`](./skills/documentation.md) | README, API docs, examples, inline comments |
| [`skills/mcp.md`](./skills/mcp.md) | MCP server implementation, tool definitions, binary setup |
| [`skills/ci-cd.md`](./skills/ci-cd.md) | GitHub Actions, automated testing, npm publishing |

## Agent Guidelines

### 1. Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types in public API
- **Formatting**: Prettier with project defaults
- **Linting**: ESLint with TypeScript support
- **Testing**: 90%+ coverage required
- **Documentation**: All public APIs must have JSDoc comments

### 2. Development Workflow

```bash
# Install dependencies
pnpm install

# Development mode
pnpm run dev

# Run tests
pnpm run test

# Build for production
pnpm run build

# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Formatting
pnpm run format
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

## Requesting Agent Assistance

When requesting help from an AI agent, please:

1. **Be specific** about what you need
2. **Reference the relevant skill** file if applicable
3. **Provide context** about the current state
4. **Specify constraints** or requirements

### Example Requests

```
"Please implement the strip-fences repair strategy following the specs in DEV_PLAN.md"

"Add unit tests for the fix-json module with 90%+ coverage"

"Update the README with installation and usage examples"

"Set up GitHub Actions for CI/CD with test and publish workflows"
```

## Project Structure Reference

```
structured-output-repair/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── repair/                     # Repair strategies
│   ├── mcp/                        # MCP server
│   ├── utils/                      # Utilities
│   └── types/                      # Type definitions
├── test/                           # Test files
├── skills/                         # Agent skill definitions
├── DEV_PLAN.md                     # Detailed implementation plan
├── AGENTS.md                       # This file
├── package.json
└── [config files]
```

## Key Resources

- [DEV_PLAN.md](./DEV_PLAN.md) — Complete implementation specification
- [skills/](./skills/) — Agent skill definitions
- [Zod Documentation](https://zod.dev/) — Schema validation library
- [MCP SDK Docs](https://github.com/modelcontextprotocol/typescript-sdk) — MCP implementation

## License

MIT License — See [LICENSE](./LICENSE) file for details.
