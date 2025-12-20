# OOO (Out Of Office)

Internal, trust-based leave request tool built with React + TypeScript + Vite and Firebase.

## What’s inside

- Google-only Firebase Auth with whitelist gate
- Teams with team lead + manager approvals (two-step flow)
- Leave requests with overlap checks and audit logs
- Working-day calculations (Sun–Thu) and minute-based durations
- Home calendar with week/month/year views of approved leave
- Leave balances per year with admin adjustments and carryover support
- Admin dashboard for users, teams, roles, and balance audits

## Roles

- Admin: manages users/teams, sees all approved leave in the calendar
- Team lead: approves step 1 (except own requests)
- Manager: approves final step
- Employee: creates and views own leave and balance adjustments

## Tech stack

- React + TypeScript + Vite
- Firebase Auth (Google only)
- Firestore
- Tailwind CSS + shadcn/ui

## Local setup

1. Install deps:
   ```bash
   npm install
   ```
2. Configure Firebase:
   - Create `.env.local`
   - Add Vite env vars:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   - If any config is missing, dev mode shows a config error screen.

3. Run the app:
   ```bash
   npm run dev
   ```

## Firestore rules

The project includes `firestore.rules` with lightweight access control based on whitelist, role, and team.
To apply:

```bash
firebase login
firebase use <project-id>
firebase deploy --only firestore:rules
```

## Scripts

- `npm run dev` – start Vite dev server
- `npm run lint` – run ESLint
- `npm run build` – type-check and build
- `npm run preview` – preview the production build
- `npm run test` – run Vitest

## Notes

- Firestore is the source of truth. All mutations are logged.
- No Cloud Functions or backend services are used.
- Security relies on Auth + Firestore rules + app-level checks.
