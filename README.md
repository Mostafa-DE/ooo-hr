# OOO (Out Of Office)

Internal, trust-based leave request tool built with React + TypeScript + Vite and Firebase.

## What’s inside

- Google-only Firebase Auth with whitelist gate
- Teams with team lead + manager approvals (two-step flow)
- Leave requests with overlap checks and audit logs
- Home calendar with week/month views of approved leave
- Admin dashboard for users, teams, and roles

## Roles

- Admin: manages users/teams, sees all approved leave in the calendar
- Team lead: approves step 1 (except own requests)
- Manager: approves final step
- Employee: creates and views own leave

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

## Scripts

- `npm run dev` – start Vite dev server
- `npm run lint` – run ESLint
- `npm run build` – type-check and build
- `npm run preview` – preview the production build

## Notes

- Firestore is the source of truth. All mutations are logged.
- No Cloud Functions or backend services are used.
- Security relies on Auth + Firestore rules + app-level checks.
