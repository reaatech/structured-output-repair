# Skill: CI/CD

**Category**: DevOps
**Difficulty**: Intermediate
**Estimated Time**: 1-2 hours

## Overview

This skill covers the CI/CD pipeline for the structured-output-repair monorepo using GitHub Actions, Turborepo, and Changesets. It includes automated testing across Node.js versions, multi-job CI with artifact caching, and automated npm publishing with provenance.

## Capabilities

An AI agent with this skill can:

1. **Understand the CI Workflow** (`.github/workflows/ci.yml`)
   - Multi-job pipeline: install → (audit, format, lint, typecheck) → build → (test [matrix 20/22], coverage) → all-checks
   - Artifact passing between jobs via `actions/cache@v4` and `actions/upload-artifact@v4`
   - Concurrency with `cancel-in-progress: true`
   - Coverage summary posted to GitHub step summary

2. **Understand the Release Workflow** (`.github/workflows/release.yml`)
   - Triggered on push to `main` and `workflow_dispatch`
   - Uses `changesets/action@v1` for automated versioning
   - Publishes to npm with provenance (`NPM_CONFIG_PROVENANCE: 'true'`)
   - Mirrors published packages to GitHub Packages
   - Concurrency with `cancel-in-progress: false`

3. **Configure Dependabot** (`.github/dependabot.yml`)
   - Weekly updates on Monday 09:00 America/Chicago
   - Groups: `production-deps` and `development-deps`
   - `rebase-strategy: auto`, `open-pull-requests-limit: 10`

4. **GitHub Repository Settings**
   - `NPM_TOKEN` repository secret for npm publishing
   - Actions permissions: "Read and write" + "Allow PR creation"
   - Branch protection on `main` requiring CI checks

5. **Versioning and Release Process**
   - `pnpm changeset` → create changeset per PR
   - `pnpm version-packages` → bump versions + generate CHANGELOGs (CI)
   - `pnpm release` → `turbo run build && changeset publish` (CI)

## When to Use This Skill

- Setting up CI/CD for the first time
- Adding a new CI job or step
- Updating Node.js version matrix
- Fixing a broken workflow
- Preparing for the first npm publish

## Example Requests

```
"Update the CI workflow to add a new job"

"Fix the release workflow's mirror step for a new package"

"Update Dependabot to include a new package ecosystem"

"Debug why the Version Packages PR isn't being created"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Updated workflow files in `.github/workflows/`
- [ ] All workflows validated (syntax checks)
- [ ] CI passes on PR
- [ ] Release workflow generates Version Packages PR
- [ ] `NPM_TOKEN` secret configured in GitHub

## Dependencies

This skill requires:
- GitHub repository with Actions enabled
- npm account with publishing permissions
- `@changesets/cli` and `@changesets/changelog-github` in root devDependencies
- `.changeset/config.json` with `access: "public"`

## CI Workflow Structure

```
┌──────────┐
│ install  │  pnpm install --frozen-lockfile, cache store
└────┬─────┘
     │
     ├──────────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼
┌────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
│ audit  │   │  format  │  │   lint   │  │ typecheck │
│(no dep)│   │(needs:   │  │(needs:   │  │(needs:    │
│        │   │ install) │  │ install) │  │ install)  │
└────────┘   └──────────┘  └──────────┘  └────┬─────┘
                                              │
                         ┌────────────────────┘
                         ▼
                   ┌──────────┐
                   │  build   │  turbo run build, upload artifacts
                   │(needs:   │
                   │ lint,    │
                   │ typecheck│
                   └────┬─────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────┐       ┌──────────┐
        │   test   │       │ coverage │
        │  (matrix │       │(needs:   │
        │  20, 22) │       │  build)  │
        │(needs:   │       │          │
        │  build)  │       │summary → │
        │          │       │step sum. │
        └──────────┘       └──────────┘
              │                   │
              └─────────┬─────────┘
                        ▼
                 ┌──────────────┐
                 │ all-checks   │  aggregator gate
                 │(needs: all   │
                 │ above)       │
                 └──────────────┘
```

## Key Conventions

### Action versions
All actions pinned to `v4` (`actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/cache@v4`).

### Node.js versions
Matrix tests on Node `[20, 22]`. Default env uses `NODE_VERSION: 22`.

### pnpm
Uses `pnpm/action-setup@v4` which reads `packageManager` from root `package.json` (`pnpm@10.22.0`).

### Release flow
1. PR with changeset merges to `main`
2. Release workflow opens/updates a "Version Packages" PR
3. Version Packages PR bumps versions + CHANGELOGs
4. Merging Version Packages PR triggers publish to npm + GitHub Packages mirror

### NPM Provenance
Enabled via `NPM_CONFIG_PROVENANCE: 'true'` in the release workflow. Requires `id-token: write` permission and matching `repository.url` in each `package.json`.

## First-Publish Bootstrap

The first publish to npm must be done manually from a local machine. CI cannot create the first version of a brand-new package scope.

## Best Practices

1. **Fail Fast** — Run quick checks (format, lint) before slow tests (build, test)
2. **Cache Aggressively** — Cache pnpm store and node_modules between jobs
3. **Concurrency Control** — CI cancels in-progress runs on new pushes; release does not
4. **Matrix Testing** — Test on oldest supported LTS (20) and current (22)
5. **Aggregator Gate** — `all-checks` job acts as a single required status check
6. **Provenance** — Always publish with npm provenance for supply chain trust

## Troubleshooting

### Issue: CI can't find pnpm
- **Solution**: Verify `pnpm/action-setup@v4` is before `setup-node` with `cache: 'pnpm'`

### Issue: Version Packages PR not created
- **Solution**: Check Actions permissions: "Read and write" + "Allow PR creation"

### Issue: npm publish fails with 404
- **Solution**: First publish must be done manually

### Issue: Provenance verification fails
- **Solution**: Ensure `id-token: write` permission and `repository.url` in package.json matches

### Issue: Turbo cache not hitting
- **Solution**: Verify `turbo.json` task definitions and that cache keys are stable

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Changesets GitHub Action](https://github.com/changesets/action)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Turborepo CI Guide](https://turbo.build/repo/docs/ci)

## Related Skills

- [`setup.md`](./setup.md) — Project initialization
- [`testing.md`](./testing.md) — Tests that run in CI
- [`mcp.md`](./mcp.md) — MCP binary publishing
