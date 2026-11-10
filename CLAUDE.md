# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal nutrition tracking app. It is an npm-workspaces monorepo with two packages: `backend/` (NestJS API) and `frontend/` (React SPA). Right now it is scaffolding only. The one real endpoint is `GET /health`.

## Commands

Run these from the repo root:

```sh
cp .env.example .env        # first time; one shared .env for compose + backend + vite
npm install
npm run db:up               # Postgres 17 in Docker, waits until healthy (db:down to stop)
npm run dev                 # backend :3000 (nest --watch) + frontend :5173 (vite), via concurrently
npm run lint                # ESLint over the whole repo (type-aware); lint:fix to autofix
npm run format:check        # Prettier; `npm run format` to write
npm run typecheck           # tsc --noEmit in both workspaces
npm test                    # backend unit tests (src/**/*.spec.ts)
npm run test:e2e            # backend e2e tests (test/**/*.e2e-spec.ts), no DB required
npm run build
```

Running a single test. Pass Jest arguments to the **workspace** script. The root `test:e2e` wrapper does not forward Jest flags such as `-t`.

```sh
npm test -w backend -- src/health/health.controller.spec.ts   # one file
npm test -w backend -- -t "database ping"                     # by test name
npm run test:e2e -w backend -- -t "503"
```

Migrations use the TypeORM CLI through `backend/src/data-source.ts`. `synchronize` is always off, so every schema change needs a migration:

```sh
npm run migration:generate -w backend -- src/migrations/<Name>
npm run migration:run -w backend      # also: migration:revert, migration:show
```

## Environment gotchas

- **Node ≥ 20.19 is required** (developed on Node 26, pinned in `.node-version`). This machine also has an old system Node 14 at `C:\Program Files\nodejs`. fnm only provides Node 26 in shells where `fnm env` has run. If you see `SyntaxError: Unexpected string` or npm 6-style `npm ERR! code ELIFECYCLE`, the wrong Node is active. `.npmrc` sets `engine-strict=true`, so `npm install` fails fast on an unsupported Node.
- **TypeScript is pinned to `~6.0` on purpose.** Do not upgrade to TypeScript 7: typescript-eslint (`<6.1`) and ts-jest (`<7`) don't support it yet. TS 6 requires an explicit `rootDir` when `outDir` is set, and deprecates `baseUrl`.
- **NestJS 12 packages are ESM-only, while the backend compiles to CommonJS** (`module: nodenext`, no `"type": "module"`). As a result:
  - Jest must run under `node --experimental-vm-modules` through `backend/scripts/jest.mjs`. Always use the npm scripts. Bare `jest` / `npx jest` fails with "Must use import to load ES Module". The launcher resolves `jest` by module name because workspaces hoist it to the root `node_modules`.
  - Keep relative imports extensionless in backend code (CJS-style). The frontend is a native ESM package (`"type": "module"`).
- **Terminus 12 API:** `HealthCheckError` no longer exists. A health indicator reports failure by _resolving_ `{ <key>: { status: 'down' } }`, not by throwing. Tests mock it that way (see `backend/test/health.e2e-spec.ts`).

## Architecture

### Config and env loading

There is one `.env` at the repo root. Each consumer reads it differently:

- `docker-compose.yml` reads `POSTGRES_*`.
- The backend's `ConfigModule` (`backend/src/app.module.ts`) loads `.env` from both `cwd` and `cwd/..`, so it works whether started from `backend/` (npm workspace) or from the root.
- `data-source.ts` loads the same paths with `dotenv`, for the TypeORM CLI, which runs outside Nest.
- Vite (`frontend/vite.config.ts`) sets `envDir` to the repo root. Only `VITE_*` variables reach the browser.

### Database config is defined once

`backend/src/config/database.config.ts` exports `buildDatabaseOptions(envReader)`. Two places use it:

- the Nest app (`TypeOrmModule.forRootAsync` with `ConfigService`, plus `autoLoadEntities: true`);
- the CLI `DataSource` (`process.env`, entities found by the `**/*.entity.{ts,js}` glob).

Change connection settings in that function, not in either consumer. New entities register through `TypeOrmModule.forFeature([...])` in their feature module. The CLI finds them by the `*.entity.ts` filename convention, so keep that suffix.

### Backend request pipeline

`main.ts` installs a global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`. Request DTOs should be classes decorated with class-validator. Unknown properties are rejected with 400, not silently stripped. If the database is unreachable at startup, `TypeOrmModule` retries the connection and the app does not listen until it connects.

### Testing strategy

- **Unit specs** live next to their source (`src/**/*.spec.ts`; Jest `rootDir` is `src`, configured in `backend/package.json`) and replace collaborators with `Test.createTestingModule` plus `useValue` mocks.
- **E2E specs** (`backend/test/`) boot real Nest modules over HTTP with supertest. They import the _feature_ module (for example `HealthModule`), not `AppModule`, and override DB-touching providers, so they don't need Postgres.

### Frontend ↔ backend

The backend has no global route prefix and no CORS setup. In dev, the frontend calls `/api/*`. Vite proxies that to `VITE_API_PROXY_TARGET` (default `http://localhost:3000`) and strips `/api`, so `/api/health` reaches `GET /health`.

### Lint and format

A single flat config, `eslint.config.mjs` at the root, covers both packages, with type-aware `typescript-eslint` via `projectService`. It has per-path overrides:

- `backend/**`: Node globals, plus Jest globals and relaxed `no-unsafe-assignment` / `unbound-method` in specs.
- `frontend/**`: browser globals, `react-hooks`, `react-refresh`.

`eslint-config-prettier` comes last. Formatting is owned by Prettier (`.prettierrc.json`: single quotes, trailing commas, width 100, LF), not ESLint. Line endings are LF everywhere (`.gitattributes`, `.editorconfig`).

TypeScript strictness lives in `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`) and both packages extend it. The frontend uses project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`).
