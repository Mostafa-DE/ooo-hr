# AGENTS.md — ooo (out of office)

## Purpose

This document defines **strict rules** for any AI agent working on the ooo codebase.

Agents must follow these rules exactly when:

- Generating code
- Refactoring
- Adding features
- Making architectural decisions

Violation of these rules means the output is incorrect.

---

## Core Architectural Decision (Non-Negotiable)

🚫 **Do NOT use Firebase Cloud Functions**

All logic is handled at the **application level** using:

- Firebase Auth
- Firestore
- Firestore Security Rules
- Client-side validation and guards

This is an **internal, trust-based tool**.
We accept controlled risk in exchange for simplicity and speed.

---

## Scope Enforcement (Critical)

Agents **must not**:

- Add HR features (balances, accruals, policies)
- Add attendance or time tracking
- Expand approval flows beyond Team Lead → Manager
- Introduce CEO approval logic
- Add company-wide calendars
- Over-engineer permissions or org charts
- Introduce backend services or server APIs

ooo is intentionally limited.

---

## Tech Stack (Fixed)

- React + TypeScript (Vite)
- Firebase Auth (Google only)
- Firestore
- Jotai for state
- Tailwind CSS + shadcn/ui

Do not introduce:

- Cloud Functions
- Redux / Zustand / MobX
- ORMs
- Custom auth systems
- Alternative UI libraries

---

## Security Model (App-Level)

Security is enforced via:

- Firebase Auth (Google sign-in)
- Whitelisted users
- Firestore Security Rules
- UI-level permission checks

Assumptions:

- All users are employees
- VPN + auth is sufficient
- Admin users are trusted

Do **not** design for hostile public users.

---

## Permission Rules

- Only whitelisted users can access data
- Users can only:
  - Create leave requests for themselves
  - Read their team’s data
- Admin users can:
  - Create teams
  - Assign roles
  - Manage whitelist
- Team Leads:
  - Can approve step 1 (except their own requests)
- Managers:
  - Can approve final step
- If no manager exists:
  - Approval is automatic

All checks must be enforced in:

- UI logic
- Firestore rules (where reasonable)

---

## Data Integrity Rules

- No overlapping leave per employee (pending or approved)
- Status transitions must be linear and explicit
- Every mutation must create a log entry
- No silent state changes
- No implicit approvals

Even without backend enforcement, **code must behave predictably**.

---

## Firestore Usage Rules

- Firestore is the single source of truth
- Documents must be easy to inspect manually
- Avoid deeply nested or clever schemas
- Prefer readable status fields over derived state

Firestore rules should:

- Block obvious misuse
- Not encode complex business logic

---

## Coding Style

- TypeScript strict mode
- No `any`
- Use `type`, not `interface` (unless required)
- Functional components only
- Explicit, readable code
- One responsibility per file

Avoid clever abstractions.

---

## State Management (Jotai)

- Atoms for:
  - Auth state
  - Current user profile
  - Team context
  - UI state only
- Firestore remains the source of truth
- Do not mirror Firestore collections in atoms

---

## UI Rules

- Use shadcn/ui primitives
- Tailwind for layout
- No custom design systems
- Prefer lists over complex calendar grids
- Home calendar shows:
  - Team-only
  - Approved leaves
  - Today / This week views

---

## Logging Rules

Every leave request action must be logged:

- submit
- approve (step 1 / step 2)
- reject
- cancel

Logs must include:

- Actor
- Timestamp
- Action
- Optional comment

Logs are append-only.

---

## Testing Guidance

- Testing is optional but encouraged for:
  - Overlap detection logic
  - Status transition helpers
- Avoid UI snapshot testing
- Do not add testing frameworks unless justified

---

## Agent Conduct Rules

- Do not expand scope without explicit approval
- Do not redesign flows
- Do not introduce new roles
- Do not move logic to backend services
- When unsure, ask before acting

---

## Final Reminder

ooo is:

- Small
- Trust-based
- Internal
- Disposable

Agents must respect this philosophy at all times.
