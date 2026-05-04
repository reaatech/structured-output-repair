# Skill: Setup

**Category**: Project Initialization
**Difficulty**: Beginner
**Estimated Time**: 15-30 minutes

## Overview

This skill covers initial project setup including monorepo scaffolding, package manager configuration, TypeScript setup, build tools, and development environment configuration.

## Capabilities

An AI agent with this skill can:

1. **Initialize Monorepo Structure**
   - Create `packages/` with `core/` and `mcp/` subdirectories
   - Set up `pnpm-workspace.yaml` pointing to `packages/*`
   - Create `turbo.json` for task orchestration

2. **Package Manager Setup**
   - Configure `package.json` as `"private": true` workspace root
   - Set `"packageManager": "pnpm@10.22.0"`
   - Add workspace-level devDependencies (biome, turbo, typescript, vitest, changesets)

3. **TypeScript Configuration**
   - Set up root `tsconfig.json` with strict mode and `verbatimModuleSyntax`
   - Create `tsconfig.typecheck.json` with workspace path aliases
   - Create per-package `tsconfig.json` extending the root

4. **Build Tool Configuration**
   - Per-package tsup via inline CLI: `tsup src/index.ts --format cjs,esm --dts --clean`
   - Dual ESM/CJS output with `main`/`module`/`types`/`exports`
   - Turborepo `build` task with `"dependsOn": ["^build"]`

5. **Development Tools**
   - Configure Biome for formatting and linting (`biome.json`)
   - Set up `.npmrc` with `shamefully-hoist=false` and `strict-peer-dependencies=true`
   - Create `.nvmrc` pinning Node.js 22

6. **Testing Setup**
   - Per-package `vitest.config.ts` with `globals: false`
   - Colocated tests at `src/*.test.ts`
   - `@vitest/coverage-v8` for coverage reporting

## When to Use This Skill

- Starting a new package in the monorepo
- Setting up a fresh development environment
- Onboarding new team members
- Reconfiguring tooling after a major version bump

## Example Requests

```
"Set up a new package under packages/ in the structured-output-repair monorepo"

"Configure TypeScript with strict mode for this package"

"Add tsup build configuration with dual ESM/CJS output"

"Create the vitest config for a new package"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Per-package directory with `src/`, `package.json`, `tsconfig.json`, `vitest.config.ts`
- [ ] `package.json` with `@reaatech/structured-repair-*` name, publishConfig, exports
- [ ] Build producing both `dist/index.js` and `dist/index.cjs`
- [ ] Tests discoverable by vitest (`src/*.test.ts`)
- [ ] All config files committed to git

## Dependencies

This skill requires:
- Node.js 22 (pinned in `.nvmrc`)
- pnpm 10.22+ installed
- Basic understanding of TypeScript and monorepos

## Monorepo Convention

### Package naming

Package directory names map to npm names via a prefix strip:

| Directory | npm Name |
|-----------|----------|
| `packages/core` | `@reaatech/structured-repair-core` |
| `packages/mcp` | `@reaatech/structured-repair-mcp` |

The release workflow mirror step uses `${name#@reaatech/structured-repair-}` to convert back.

### Per-package tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### Per-package vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
```

## Best Practices

1. **Follow the existing package pattern** — Copy `packages/core/package.json` as a template
2. **Use workspace protocol** — `"@reaatech/structured-repair-core": "workspace:*"` for internal deps
3. **Strict TypeScript** — All strict flags enabled, no `any` in public API
4. **Colocated tests** — Tests live next to source as `src/*.test.ts`
5. **Dual output** — Always produce ESM + CJS for library packages

## Troubleshooting

### Issue: TypeScript compilation errors after extending root tsconfig
- **Solution**: Check that `module` and `moduleResolution` are `NodeNext` in the root config

### Issue: tsup can't find entry point
- **Solution**: Verify `src/index.ts` exists and the build script references it correctly

### Issue: Workspace package not resolving
- **Solution**: Run `pnpm install` from root; verify `pnpm-workspace.yaml` includes `packages/*`

### Issue: Tests not discovered
- **Solution**: Vitest auto-discovers `*.test.ts` files; verify files are in `src/` and match the pattern

## Related Skills

- [`implementation.md`](./implementation.md) — Core library implementation
- [`testing.md`](./testing.md) — Test setup and writing
- [`ci-cd.md`](./ci-cd.md) — CI/CD pipeline setup

## Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Vitest Configuration](https://vitest.dev/config/)
