# Contributing to structured-output-repair

Thank you for your interest in contributing to **structured-output-repair**! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Templates](#issue-templates)
- [Pull Request Template](#pull-request-template)

## Code of Conduct

Please be respectful and constructive in your interactions. We are committed to providing a welcoming and inclusive experience for everyone.

## Getting Started

### Prerequisites

- Node.js 22 (pinned in `.nvmrc`)
- pnpm 10.22+ (package manager)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/structured-output-repair.git
   cd structured-output-repair
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build all packages:
   ```bash
   pnpm build
   ```

### Verify Setup

```bash
# Run tests
pnpm test

# Check types
pnpm typecheck

# Check linting
pnpm lint

# Check formatting
pnpm format
```

## Project Structure

This is a **pnpm workspace monorepo** with Turborepo:

```
packages/
  core/         — Repair engine, all 4 strategies, types, errors
  mcp/          — MCP server tool (depends on core)
```

- **Build:** `tsup` per-package, Turborepo orchestration
- **Format/Lint:** Biome
- **Test:** Vitest (unit tests colocated at `src/*.test.ts`)
- **Release:** Changesets

## Development Workflow

### Branch Naming

- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Documentation: `docs/<description>`
- Chores: `chore/<description>`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

Example:
```
feat: add relax-schema repair strategy

Implements the final repair strategy that creates a more permissive
version of the schema as a last resort attempt.

Closes #42
```

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Use the bug report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS)
   - Minimal reproduction code if possible

### Suggesting Features

1. Check existing issues and DEV_PLAN.md
2. Use the feature request template
3. Explain the use case and benefits
4. Provide examples if helpful

### Contributing Code

1. **Find an issue** - Check GitHub issues or DEV_PLAN.md for planned work
2. **Comment on the issue** - Let others know you're working on it
3. **Create a branch** - From main, create your feature branch
4. **Implement changes** - Follow coding standards
5. **Write tests** - Unit tests colocated at `src/*.test.ts`
6. **Update documentation** - Keep docs in sync with code
7. **Submit a PR** - Follow the pull request template

## Coding Standards

### TypeScript

- Strict mode enabled
- No `any` types in public API
- Proper type inference
- Explicit return types for public functions

### Code Style

- Use Biome for formatting and linting
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline objects
- 100 character line width

### Documentation

- JSDoc comments for all public APIs
- Include `@example` tags with runnable code
- Document parameters, return types, and errors
- Keep inline comments focused on "why", not "what"

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# With coverage
pnpm test:coverage

# Run tests for a specific package
pnpm --filter @reaatech/structured-repair-core test
```

### Test Requirements

- **Unit tests** for all public functions
- **Integration tests** for repair pipeline
- **Edge case tests** for error handling
- Coverage thresholds enforced

### Test Structure

Tests are colocated with source files as `src/*.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripFences } from './strip-fences.js';

describe('stripFences', () => {
  it('should remove json code fences', () => {
    const input = '```json\n{ "name": "test" }\n```';
    const expected = '{ "name": "test" }';
    expect(stripFences(input)).toBe(expected);
  });
});
```

## Submitting Changes

### Before Submitting

- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### Pull Request Process

1. **Title** - Clear, concise description
2. **Description** - Explain what and why
3. **Link issues** - Reference related issues
4. **Checklist** - Complete the PR checklist
5. **Review** - Address review feedback

## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# Create a changeset
pnpm changeset

# Version packages (updates CHANGELOGs + package.json versions)
pnpm version-packages

# Publish to npm
pnpm release
```

## Resources

- [DEV_PLAN.md](./DEV_PLAN.md) - Implementation specifications
- [AGENTS.md](./AGENTS.md) - AI agent development guide
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Questions?

Feel free to open an issue for questions or discussions. We're happy to help!

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
