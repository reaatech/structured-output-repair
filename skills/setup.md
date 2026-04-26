# Skill: Setup

**Category**: Project Initialization  
**Difficulty**: Beginner  
**Estimated Time**: 30-60 minutes

## Overview

This skill covers the initial project setup including package manager configuration, TypeScript setup, build tools, and development environment configuration.

## Capabilities

An AI agent with this skill can:

1. **Initialize Project Structure**
   - Create directory structure following the project layout in DEV_PLAN.md
   - Set up src/, test/, and configuration directories
   - Create initial placeholder files

2. **Package Manager Setup**
   - Initialize pnpm with proper configuration
   - Create package.json with all required dependencies
   - Configure npm scripts for development workflow

3. **TypeScript Configuration**
   - Set up tsconfig.json with strict mode
   - Configure path aliases if needed
   - Set up type definitions for Node.js

4. **Build Tool Configuration**
   - Configure tsup for fast, zero-config builds
   - Set up dual entry points (library + MCP binary)
   - Configure source maps and declaration files

5. **Development Tools**
   - Configure ESLint with TypeScript support
   - Set up Prettier for consistent formatting
   - Configure EditorConfig for cross-editor consistency

6. **Testing Setup**
   - Configure Vitest with coverage thresholds
   - Set up test directory structure
   - Configure global test settings

## When to Use This Skill

- Starting a new project from scratch
- Setting up a development environment
- Reconfiguring existing tooling
- Onboarding new team members

## Example Requests

```
"Set up the initial project structure for structured-output-repair"

"Configure TypeScript with strict mode for this project"

"Set up pnpm with the dependencies listed in DEV_PLAN.md"

"Create the build configuration using tsup"
```

## Output Expectations

After using this skill, the agent should deliver:

- [ ] Complete directory structure created
- [ ] `.gitignore` configured for Node.js/TypeScript
- [ ] package.json with all dependencies
- [ ] TypeScript configured with strict mode
- [ ] Build tool (tsup) configured
- [ ] ESLint and Prettier configured
- [ ] Vitest configured with coverage
- [ ] All config files committed to git

## Dependencies

This skill requires:
- Node.js 20+ installed
- pnpm installed globally
- Basic understanding of TypeScript
- Access to DEV_PLAN.md for specifications

## Related Skills

- [`implementation.md`](./implementation.md) - Core library implementation
- [`testing.md`](./testing.md) - Test setup and writing
- [`ci-cd.md`](./ci-cd.md) - CI/CD pipeline setup

## Best Practices

1. **Follow DEV_PLAN.md** - Always reference the specifications in DEV_PLAN.md
2. **Use pnpm** - This project uses pnpm, not npm or yarn
3. **Strict TypeScript** - Enable all strict flags
4. **Modern Tooling** - Use latest stable versions of all tools
5. **ES Modules** - Configure for ES module output

## Troubleshooting

### Common Issues

**Issue**: TypeScript compilation errors
- **Solution**: Check tsconfig.json paths and ensure all type definitions are installed

**Issue**: Build fails with module resolution errors
- **Solution**: Verify moduleResolution is set to 'bundler' in tsconfig.json

**Issue**: Tests don't run
- **Solution**: Check vitest.config.ts and ensure test files match the pattern

## Resources

- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Vitest Configuration](https://vitest.dev/config/)
