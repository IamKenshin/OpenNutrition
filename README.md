# Nutrition Tracker

Personal nutrition tracking app. npm-workspaces monorepo:

| Package     | Stack                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| `backend/`  | NestJS 12, TypeScript (strict), PostgreSQL + TypeORM, class-validator, Jest |
| `frontend/` | React 19, TypeScript, Vite                                                  |

## Prerequisites

- Node.js ≥ 20.19 (developed on Node 26; pinned in `.node-version` for fnm/nvm) and npm ≥ 7
  - Check with `node --version` before running anything. An older Node fails with obscure errors such as
    `SyntaxError: Unexpected string`, and `.npmrc` makes `npm install` refuse to run on it.
- Docker (for the local Postgres container)

## Getting started

```sh
cp .env.example .env      # shared by docker-compose and the backend
npm install
npm run db:up             # start Postgres and wait until healthy
npm run dev               # backend on :3000, frontend on :5173
```

Check it's alive: `curl http://localhost:3000/health`. The frontend dev server also proxies `/api/*` to the backend, so `http://localhost:5173/api/health` works too.

## Scripts (run from the repo root)

| Script                                 | What it does                                       |
| -------------------------------------- | -------------------------------------------------- |
| `npm run dev`                          | Backend (watch mode) + frontend dev server         |
| `npm run dev:backend` / `dev:frontend` | Run one side only                                  |
| `npm run build`                        | Build both packages                                |
| `npm run typecheck`                    | `tsc --noEmit` in both packages                    |
| `npm run lint` / `lint:fix`            | ESLint (shared root config, type-aware)            |
| `npm run format` / `format:check`      | Prettier                                           |
| `npm test`                             | Backend unit tests (Jest)                          |
| `npm run test:e2e`                     | Backend e2e tests (Jest + supertest, no DB needed) |
| `npm run db:up` / `db:down`            | Start / stop the Postgres container                |

Database migrations (TypeORM CLI, `synchronize` is off):

```sh
npm run migration:generate -w backend -- src/migrations/<Name>
npm run migration:run -w backend
npm run migration:revert -w backend
```

## Notes

- NestJS 12 packages are ESM-only while the backend compiles to CommonJS, so Jest runs under
  `node --experimental-vm-modules` (see `backend/scripts/jest.mjs`), matching the official Nest 12 template.
- TypeScript is pinned to `~6.0`: typescript-eslint and ts-jest don't support TypeScript 7 yet.
