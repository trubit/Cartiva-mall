# TrusonShopp Platform — Testing Strategy

## Overview

The repository features comprehensive automated unit, integration, component, and end-to-end test suites.

---

## Test Execution Commands

| Suite                           | Command                 | Config File                                  |
| ------------------------------- | ----------------------- | -------------------------------------------- |
| Client & Shared Unit Tests      | `npm run test`          | `vitest.config.ts`                           |
| Server Unit & Integration Tests | `npm run test:server`   | `vitest.config.server.ts`                    |
| All Unit/Integration Tests      | `npm run test:all`      | Combined                                     |
| Playwright E2E Tests            | `npm run test:e2e`      | `playwright.config.ts`                       |
| TypeScript Typecheck            | `npm run typecheck:all` | `tsconfig.app.json` + `tsconfig.server.json` |

---

## Vitest Windows Configuration

To avoid child process startup timeouts on Windows, `vitest.config.ts` uses:

- `pool: 'threads'`
- `singleThread: true`
- `testTimeout: 30000`
