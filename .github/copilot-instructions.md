# PLOCLO CMS: Copilot Instructions

## Architecture Overview

- **Monorepo Structure**: Two main folders: `backend` (Express.js, TypeScript) and `frontend` (Next.js, TypeScript).
- **Backend**: REST API using Express, with authentication/authorization middleware (`src/middleware/`). Database access via `db.ts` (PostgreSQL, via `pool`). Routes are organized in `src/routes/` (e.g., `users.ts`, `program.ts`).
- **Frontend**: Next.js app with modular pages in `app/`, shared UI in `components/`, and i18n support via `i18n.ts` and `i18nProvider.tsx`. Uses Tailwind CSS (`tailwind.config.ts`) and custom fonts via `next/font`.
- **State & Auth**: Auth context in `frontend/app/context/AuthContext.tsx`. Protected routes use `ProtectedRoute` component and role-based access.
- **Internationalization**: Uses `react-i18next` with locale files in `locales/`.

## Developer Workflows

- **Frontend Dev**: Start with `npm run dev` in `frontend/`. Hot reload enabled. Main entry: `app/page.tsx`.
- **Backend Dev**: Start with `npm run dev` in `backend/` (if configured) or run `ts-node src/index.ts`.
- **Linting**: Frontend uses ESLint config in `eslint.config.mjs` (extends Next.js presets).
- **Deployment**: Frontend deploys to Vercel. See `frontend/README.md` for details.

## Project-Specific Patterns

- **API Calls**: Frontend uses `utils/apiClient.ts` and `utils/programApi.ts` for backend communication.
- **Role-Based Access**: Backend routes use `authenticateToken` and `authorizeRoles` middleware. Frontend uses `ProtectedRoute` for UI gating.
- **UI Conventions**: Tailwind CSS for styling. Components use className patterns for consistent look (see `NavLink.tsx`, `TabButton.tsx`).
- **i18n Usage**: All user-facing text should use `useTranslation` hook and locale keys from `locales/`.
- **Error Handling**: Backend returns JSON error objects with status codes. See catch blocks in `routes/program.ts`.

## Integration Points

- **Database**: PostgreSQL, accessed via `pool` in `db.ts`.
- **External Services**: None detected, but Vercel is used for frontend hosting.
- **Cache**: Next.js cache profiles in `.next/types/cache-life.d.ts` (for advanced usage).

## Examples

- **Add a protected backend route**:
  ```ts
  router.get('/secure', authenticateToken, authorizeRoles('admin'), async (req, res) => { ... });
  ```
- **Use i18n in frontend**:
  ```tsx
  const { t } = useTranslation("common");
  <h1>{t("program information")}</h1>;
  ```
- **API call from frontend**:
  ```ts
  import { getPrograms } from "../utils/programApi";
  const programs = await getPrograms();
  ```

## Key Files & Directories

- `backend/src/routes/` — API endpoints
- `backend/src/middleware/` — Auth & role middleware
- `frontend/app/` — Next.js pages
- `frontend/components/` — Shared UI
- `frontend/locales/` — i18n resources
- `frontend/utils/` — API clients

---

For unclear conventions or missing details, ask for clarification or check the latest code in the referenced files.
