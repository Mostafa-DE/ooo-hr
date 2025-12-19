# Repository Guidelines

## Project Structure & Modules

- `src/`: React + TypeScript source. Key folders: `components/` (UI), `pages/` (routes, incl. `pages/admin/`), `auth/` (
  guards/providers), `lib/` (firebase/config, utils), `stores/` (jotai atoms), `forms/` (schemas), `hooks/`,
  `constants/`.
- `public/`: Static assets and any JSON schemas served at runtime.
- Path alias: import app code with `@/*` (see `tsconfig.json`).

## Build, Test, and Dev Commands

- `npm run dev`: Start Vite dev server with HMR.
- `npm run build`: Type-check (`tsc -b`) then build to `dist/`.
- `npm run preview`: Serve the production build locally.
- `npm run lint`: Run ESLint per `eslint.config.js`.

## Coding Style & Naming

- TypeScript strict mode enabled; no implicit `any` or unused vars.
- Indentation: 2 spaces; prefer named exports and functional components.
- React components: PascalCase files (e.g., `AdminLayout.tsx`); hooks start with `use` and live in `src/hooks/`.
- Imports: use `@/...` alias for internal modules; keep relative paths shallow.
- Linting: follow rules from `@eslint/js`, `typescript-eslint`, React Hooks, and React Refresh configs. Run
  `npm run lint` before commits.

## Testing Guidelines

- No runner configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests next to code as `*.test.ts`/`*.test.tsx` under `src/`.
- Favor integration-style tests for pure logic; avoid brittle UI tests. Aim for meaningful coverage on utilities and
  forms.

## Commit & Pull Request Guidelines

- Commits: imperative present tense, concise subject (e.g., "Refactor auth flow"), optional details in body.
  Conventional Commits not required.
- PRs: include clear description, linked issues (`Closes #123`), screenshots/GIFs for UI changes, and test plan steps.
- Quality gate: ensure `npm run lint` and `npm run build` pass; include any env var additions (Vite vars must start with
  `VITE_`).

## Security & Configuration

- Never commit secrets. Use local `.env` and Vercel project env vars; Vite exposes only `VITE_*` at runtime.
- Firebase: keep config in `lib/`; do not access Firebase directly from feature modules—use shared helpers.

## Purpose: These rules define my personal coding style and architectural preferences.

### Follow them strictly in all suggestions, code generation, and refactoring.

## Technical Rules

- Always create tests alongside the feature; may be before or after code, but never after feature completion.
- Use cases are functions using only native data structures; no direct request cycle or DB access.
- All DB access goes through repository functions injected via context objects.
- Keep DB config and schemas in a single isolated location; do not embed in features.
- Use type over interface unless implementing a class.
- No weak typing, even in prototypes.
- Favor integration over unit tests; unit tests only for complex logic.
- Do not test UI except for critical logic; test pure functions instead.
- Prefer explicit over implicit code.
- Use a declarative style; manage reactive state declaratively.
- After each change, run `npm run lint` and `npm run build`.
- Don't assert `any` type anywhere.
- Use `as const` for constant objects and arrays.
- Use `unknown` type for untyped external data; validate before use.
