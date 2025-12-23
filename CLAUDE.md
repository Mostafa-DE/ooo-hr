# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OOO (Out Of Office) is a trust-based internal leave request management app built with React + TypeScript + Vite and Firebase. It uses Google OAuth authentication with a whitelist gate and implements a two-step approval workflow (Team Lead → Manager).

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (tsc -b) then build to dist/
npm run lint      # Run ESLint
npm run test      # Run Vitest tests
npm run preview   # Preview production build locally
```

After each change, run `npm run lint` and `npm run build`.

To deploy Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

## Architecture

### Repository Pattern
All Firestore operations are isolated in repository files (`src/lib/*Repository.ts`). Repositories are injected via React Context (`RepositoryProvider` in `src/lib/RepositoryContext.tsx`).

### Use Cases (Domain Logic)
Pure business logic lives in `src/usecases/`. Functions accept a context object with injected repositories and return async results. No direct DB access—all I/O flows through repositories.

Example pattern:
```typescript
export async function createLeaveRequest(
  context: { leaveRequestRepository, leaveBalanceRepository },
  input: CreateLeaveRequestInput,
) { /* validation + repo calls */ }
```

### Provider Chain (main.tsx)
```
RepositoryProvider → ToastProvider → AuthProvider → App
```

### Custom Hooks
Data subscriptions in `src/hooks/` subscribe to Firestore and manage loading state. Always clean up subscriptions on unmount.

## Key Directories

- `src/pages/` — Route pages including `admin/` subdirectory
- `src/components/` — UI components and shadcn/ui library
- `src/lib/` — Firebase config, repositories, utilities
- `src/usecases/` — Pure business logic with tests
- `src/hooks/` — Firestore subscription hooks
- `src/types/` — TypeScript type definitions
- `src/auth/` — Auth flow, context, guards

## Coding Rules

- **No Cloud Functions** — All logic is client-side; Firestore is source of truth
- TypeScript strict mode; no `any` or unused vars
- Use `type` over `interface` unless implementing a class
- Use `as const` for constant objects/arrays
- Use `unknown` for untyped external data; validate before use
- Functional components only; prefer named exports
- Import with `@/` alias for internal modules
- Tests live alongside source as `*.test.ts`

## Scope Restrictions (Do NOT Add)

- Cloud Functions or backend services
- HR features beyond leave balances
- Attendance/time tracking
- Approval flows beyond Team Lead → Manager
- Alternative state management (Redux, Zustand, MobX)
- Custom auth systems

## Business Logic Notes

- **Working days**: Sun–Thu (0-4 in JS Date)
- **Two-step approval**: TL approves first, then Manager
- **Auto-approval**: If no manager exists or employee is TL
- **Overlap detection**: No overlapping pending/approved leave per employee
- **Audit logs**: Every mutation creates a log entry (append-only)
- **Leave balances**: Per user, per year, per leave type with carryover support

## Testing

Vitest with tests alongside source files. Favor integration tests for pure logic over UI tests. Focus on use cases, utilities, and validation logic.

Run a single test file:
```bash
npx vitest run src/usecases/createLeaveRequest.test.ts
```
