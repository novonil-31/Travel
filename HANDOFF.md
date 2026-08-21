# ACCESS — Handoff Guide for Engineers & Agents

## Quick Orientation

Read `PROJECT_STATE.md` first for the authoritative state of all tables, endpoints, and features.

### 1. Repository Layout
- `/` — React 19 + TypeScript + Vite + Tailwind CSS Frontend.
- `/backend` — Express + Prisma + SQLite Backend & Engine logic.
- `/backend/tests` — Vitest integration test suite (22 tests).
- `/backend/prisma` — Schema and seed data.

### 2. How to Run Everything Locally

```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev
# Backend runs on http://localhost:3000
# Swagger API Docs available at http://localhost:3000/docs

# Terminal 2: Frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. How to Run Tests
```bash
cd backend
npm run test
```

### 4. Deploying to GitHub & Vercel
- **GitHub**: Commit the codebase. `dev.db` and build outputs are excluded by `.gitignore`.
- **Vercel**:
  1. Link the repository to Vercel.
  2. Build command: `npm run build`
  3. Output directory: `dist`
  4. Serverless API routes are automatically routed via `vercel.json` to `/backend/api/index.ts`.
  5. Add Environment Variables in Vercel settings:
     - `DATABASE_URL="file:./dev.db"` (or production PostgreSQL connection string)
     - `JWT_SECRET="your-32-character-production-secret"`
     - `NODE_ENV="production"`

### 5. If Context / Token Limits Are Reached
1. Inspect `PROJECT_STATE.md` to see what was last done.
2. Run `cd backend && npm run test` to verify backend health.
3. Run `npm run build` at root to verify frontend health.
4. Continue work from the next incomplete priority item.
5. Update `PROJECT_STATE.md` and `HANDOFF.md` before ending your turn.
