# Skill: CI/CD

**Category**: DevOps  
**Difficulty**: Intermediate  
**Estimated Time**: 1-2 hours

## Overview

This skill covers setting up Continuous Integration and Continuous Deployment pipelines for structured-output-repair using GitHub Actions. It includes automated testing, linting, building, and npm publishing.

## Capabilities

An AI agent with this skill can:

1. **Create GitHub Actions Workflows**
   - Set up CI workflow for automated testing on PRs
   - Configure build and test matrix for multiple Node.js versions
   - Add linting and type checking steps
   - Generate and upload coverage reports

2. **Configure Automated Publishing**
   - Set up npm publishing workflow
   - Configure version bumping and changelog generation
   - Add GitHub Releases creation
   - Implement semantic versioning

3. **Implement Quality Gates**
   - Require passing tests before merge
   - Enforce minimum test coverage
   - Add branch protection rules
   - Configure required status checks

4. **Set Up Monitoring**
   - Configure build notifications
   - Add deployment status checks
   - Set up issue templates
   - Create release checklist

5. **Security Best Practices**
   - Configure npm token security
   - Set up Dependabot for dependency updates
   - Add security scanning
   - Implement code signing

## When to Use This Skill

- Setting up CI/CD for a new project
- Adding automated testing to existing project
- Preparing for npm publication
- Setting up release automation
- Improving code quality processes

## Example Requests

```
"Create GitHub Actions workflow for automated testing"

"Set up npm publishing with semantic versioning"

"Add code coverage reporting to CI pipeline"

"Configure branch protection rules for main branch"

"Set up automated changelog generation"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] GitHub Actions workflows in .github/workflows/
- [ ] Automated testing on every PR and push
- [ ] npm publishing workflow for releases
- [ ] Coverage reporting configured
- [ ] Branch protection rules documented
- [ ] Release process documented
- [ ] All workflows tested and working

## Dependencies

This skill requires:
- Setup skill completed (project structure in place)
- Implementation skill completed (tests to run)
- GitHub repository initialized
- npm account with publishing permissions
- Access to DEV_PLAN.md for specifications

## GitHub Actions Workflows

### CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          run_install: false
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run linter
        run: pnpm lint
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Run tests
        run: pnpm test
      
      - name: Build project
        run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
          verbose: true

  check-format:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          run_install: false
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Check formatting
        run: pnpm format:check
```

### Publish Workflow

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          run_install: false
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
      
      - name: Run tests
        run: pnpm test
      
      - name: Publish to npm
        run: pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.0.0)'
        required: true
        type: string

jobs:
  release:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write
      packages: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          run_install: false
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'
          cache: 'pnpm'
      
      - name: Configure Git
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Update version
        run: npm version ${{ github.event.inputs.version }} --no-git-tag-version
      
      - name: Build and test
        run: |
          pnpm build
          pnpm test
      
      - name: Create commit and tag
        run: |
          git add package.json
          git commit -m "chore: release v${{ github.event.inputs.version }}"
          git tag "v${{ github.event.inputs.version }}"
          git push origin main --tags
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ github.event.inputs.version }}
          name: v${{ github.event.inputs.version }}
          generate_release_notes: true
```

## Branch Protection Rules

Configure these rules in GitHub repository settings:

```
Branch: main

Protection rules:
- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] CI (test job)
  - [x] CI (check-format job)
- [x] Require branches to be up to date before merging
- [x] Require conversation resolution before merging
- [x] Include administrators
```

## NPM Publishing Setup

### 1. Create npm Account
- Sign up at [npmjs.com](https://www.npmjs.com/)
- Verify email address

### 2. Generate npm Token
```bash
npm login
npm token create --read-only false
```

### 3. Add Token to GitHub Secrets
- Go to repository Settings → Secrets and variables → Actions
- Add new secret: `NPM_TOKEN` with your npm token

### 4. Test Publishing
```bash
# Dry run (doesn't actually publish)
npm publish --dry-run

# Actual publish (be careful!)
npm publish --access public
```

## Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # Enable version updates for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    versioning-strategy: increase
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore(deps)"
    
  # Enable version updates for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    labels:
      - "dependencies"
      - "automated"
    commit-message:
      prefix: "chore(deps)"
```

## Security Scanning

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run pnpm audit
        run: pnpm audit --audit-level high
```

## Best Practices

1. **Fail Fast** - Run quick checks (lint, format) before slow tests
2. **Cache Dependencies** - Use pnpm cache to speed up builds
3. **Test Multiple Versions** - Test on multiple Node.js versions
4. **Secure Secrets** - Never expose npm tokens in logs
5. **Semantic Versioning** - Follow semver for releases
6. **Automated Testing** - Run tests on every PR
7. **Coverage Requirements** - Maintain minimum coverage thresholds

## Common Issues

### Issue: npm publish fails with "already exists"
- **Solution**: Bump version number, unpublish old version (if within 24 hours)

### Issue: GitHub Actions can't find pnpm
- **Solution**: Use pnpm/action-setup before setup-node, or install pnpm globally

### Issue: Tests pass locally but fail in CI
- **Solution**: Check for environment-specific code, ensure deterministic tests

### Issue: Coverage upload fails
- **Solution**: Verify coverage file path, check Codecov token if using private repo

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm GitHub Action](https://github.com/pnpm/action-setup)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry/publishing-packages)
- [Semantic Versioning](https://semver.org/)
- [DEV_PLAN.md](../DEV_PLAN.md) - Project specifications

## Related Skills

- [`setup.md`](./setup.md) - Project initialization
- [`testing.md`](./testing.md) - Writing tests for CI
- [`mcp.md`](./mcp.md) - MCP tool publishing
