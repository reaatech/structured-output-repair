# ARCHITECTURE.md — structured-output-repair

> System-level design for the structured-output-repair monorepo.

## Overview

This monorepo implements a TypeScript library that catches and repairs malformed LLM structured outputs. It ships as both an npm library and an MCP server tool.

## Package Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                 @reaatech/structured-repair-core             │
│  ┌──────────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │  Repair Pipeline  │  │ 4 Strategies│  │  Types & Errors │  │
│  │  (orchestrator)   │  │            │  │                 │  │
│  └──────────────────┘  └────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               │  dependency (workspace:*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                @reaatech/structured-repair-mcp               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │ MCP Server   │  │ JSON Schema    │  │ Binary Entry     │ │
│  │ (stdio)      │  │ → Zod Converter│  │ (npx binary)     │ │
│  └──────────────┘  └────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Core Repair Pipeline

```
Raw LLM Output (string)
    │
    ▼
Phase 1: String Strategies ────────────────────────────────────
    │  strip-fences → fix-json-syntax
    │  (remove markdown, fix syntax)
    ▼
Phase 2: Parse JSON ──────────────────────────────────────────
    │  JSON.parse()
    │  (return failure if unparseable)
    ▼
Phase 3: Direct Validation ───────────────────────────────────
    │  schema.safeParse(parsed)
    │  (check if already valid)
    ▼
Phase 4: Object Strategies (iterative, max 3 passes) ─────────
    │  coerce-types → remove-extra-fields → revalidate
    │  (loop until valid or no more changes)
    ▼
RepairResult<T> { success, data, steps, errors }
```

### MCP Tool Request Flow

```
MCP Client (Claude Desktop, etc.)
    │  stdio (JSON-RPC)
    ▼
MCP Server (StdioServerTransport)
    │  tools/call { name: "structured.repair", arguments: {...} }
    ▼
Tool Handler
    ├── 1. Validate arguments (Zod)
    ├── 2. Convert JSON Schema → Zod (jsonSchemaToZod)
    ├── 3. Call repairOutput() from core
    └── 4. Format MCP response
```

### MCP Server → Core Relationship

```
┌────────────────────────┐      ┌──────────────────────────┐
│ structured-repair-mcp  │─────►│ structured-repair-core    │
│                        │      │                          │
│ server.ts              │      │ repair/index.ts          │
│   └─ import {          │      │   ├─ repairOutput()       │
│        repairOutput,   │─────►│   ├─ analyzeInput()       │
│        analyzeInput }  │      │   └─ types.ts             │
│     from '@reaatech/   │      │                          │
│     structured-repair- │      │ repair/strategies/        │
│     core'              │      │   ├─ strip-fences.ts      │
│                        │      │   ├─ fix-json.ts          │
│ utils.ts               │      │   ├─ coerce-types.ts      │
│   └─ jsonSchemaToZod() │      │   └─ remove-extra-fields.ts
└────────────────────────┘      │                          │
                                │ utils/                    │
                                │   ├─ errors.ts            │
                                │   └─ logger.ts            │
                                └──────────────────────────┘
```

## State Machine

### Repair Pipeline State

```
              ┌──────────┐
   raw string │  INPUT   │
       ──────►│          │
              └────┬─────┘
                   │
                   ▼
              ┌──────────┐     failure
              │  REPAIR  │────────────┐
              │  (4 phases)│            │
              └────┬─────┘            ▼
                   │            ┌──────────┐
                   │ success    │  ERROR   │
                   ▼            │(collect) │
              ┌──────────┐     └──────────┘
              │  PARSE   │
              └────┬─────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌────────┐ ┌───────┐ ┌────────┐
    │ VALID  │ │COERCE │ │ STRIP  │
    │(direct)│ │ TYPES │ │ EXTRAS │
    └────┬───┘ └───┬───┘ └───┬────┘
         │         │         │
         │    ┌────┘    ┌────┘
         │    ▼         ▼
         │ ┌──────────────┐
         │ │  REVALIDATE  │───┐ failure (up to 3 passes)
         │ └──────┬───────┘   │
         │        │ success   │
         └────────┼───────────┘
                  ▼
           ┌──────────┐
           │ REPAIRED │
           │  (data)  │
           └──────────┘
```

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Package manager | pnpm (v10) | Workspace support, strict peer deps, fast |
| Build | tsup (per-package) | ESM + CJS dual output, fast esbuild-based |
| Orchestration | Turborepo | Parallel builds, caching, dependency-aware |
| Schema validation | Zod | Runtime validation with full type inference |
| Format/Lint | Biome | Single tool, fast, no plugin config needed |
| Test | Vitest | Fast, TypeScript-native, colocated tests |
| Release | Changesets | Automated versioning, CHANGELOGs, npm provenance |
| MCP transport | @modelcontextprotocol/sdk | Stdio transport, JSON-RPC 2.0 |

## Extension Points

- **New repair strategies** — add a strategy function to `packages/core/src/repair/` and register it in the pipeline (`repair/index.ts`)
- **New MCP tools** — add a tool handler in `packages/mcp/src/server.ts` and register it in `ListToolsRequestSchema`
- **Additional JSON Schema support** — extend `jsonSchemaToZod()` in `packages/mcp/src/utils.ts` with new keyword handlers
- **Custom logger** — replace `createLogger()` in `packages/core/src/utils/logger.ts` or inject via `RepairOptions`
