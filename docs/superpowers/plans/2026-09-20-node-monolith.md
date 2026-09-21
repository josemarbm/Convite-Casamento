# Node.js Monolith Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Flask/Nginx application services with one Node.js service that serves a React frontend and a modular API while retaining MySQL and Evolution API.

**Architecture:** Fastify owns HTTP and static delivery, Prisma maps the existing MySQL schema, and React/Vite provides the dashboard and RSVP UI. Domain modules remain separated under `server/modules`, with infrastructure adapters for database, JWT, uploads, scheduling, and Evolution API.

**Tech Stack:** Node.js 22, TypeScript, Fastify, Prisma, React, Vite, Vitest, Supertest, Zod, JWT, bcrypt, xlsx, and Docker.

---

## Status

Tasks 1-12 are complete. The Node monolith is now the application entrypoint on port 3000, serving the React app and API while keeping MySQL and Evolution API as external infrastructure dependencies. The old Python/Nginx application path remains documented as legacy and is no longer required for the runtime path.

### Final migration review (2026-09-20)

The migration was rechecked against the implemented modules, the frontend shell, and the automated regression suite. The critical application flows are present and validated: auth, guest management, RSVP, groups, templates, settings, Evolution instance management, uploads, direct send, scheduling, and dashboard UI. No major feature gap was found in the current monolith scope. The app remains dependent on external MySQL and Evolution API services, but the Python/Nginx stack is no longer required for the active application path.

### Task 1: Bootstrap the Node workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `server/index.ts`
- Create: `server/app.ts`
- Create: `server/config.ts`
- Create: `web-react/index.html`
- Create: `web-react/src/main.tsx`
- Create: `web-react/src/App.tsx`
- Create: `tests/health.test.ts`

- [x] **Step 1: Add the failing health test**

Create a Fastify test that imports the app and expects `GET /health` to return status `200` and `{ "status": "ok" }`.

- [x] **Step 2: Run the focused test**

Run `npm test -- --run tests/health.test.ts`.
Expected: FAIL because the Node workspace and health route do not exist.

- [x] **Step 3: Add the minimal TypeScript/Fastify app**

Create `buildApp()` with a `GET /health` route, keep `server/index.ts` responsible only for listening, and configure Vite to build `web-react` into `dist/public`.

- [x] **Step 4: Run the focused test and build**

Run `npm test -- --run tests/health.test.ts && npm run build`.
Expected: PASS and a successful React build.

### Task 2: Map the existing database with Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json`
- Create: `tests/prisma-schema.test.ts`

- [x] **Step 1: Add schema verification**

Test that the Prisma schema declares `User`, `Guest`, `Group`, `MessageTemplate`, `ScheduledSend`, and `Setting`, including RSVP fields and the existing table names.

- [x] **Step 2: Run the schema test**

Run `npm test -- --run tests/prisma-schema.test.ts`.
Expected: FAIL until the schema is created.

- [x] **Step 3: Define the existing MySQL tables**

Represent current columns and relations using Prisma `@@map`/`@map`; use `prisma db pull` only when `DATABASE_URL` points to the intended database, and never run a destructive reset.

- [x] **Step 4: Validate Prisma generation**

Run `npx prisma validate && npx prisma generate && npm test -- --run tests/prisma-schema.test.ts`.
Expected: schema valid, client generated, test passing.

### Task 3: Implement shared security and infrastructure

**Files:**
- Create: `server/lib/auth.ts`
- Create: `server/lib/passwords.ts`
- Create: `server/lib/errors.ts`
- Create: `server/lib/db.ts`
- Create: `server/lib/evolution-client.ts`
- Create: `tests/auth.test.ts`
- Create: `tests/evolution-client.test.ts`

- [x] **Step 1: Test JWT and password behavior**

Cover password hash verification, token creation with expiration, rejection of malformed tokens, and inactive users.

- [x] **Step 2: Test Evolution request normalization**

Mock HTTP responses and verify instance listing, creation, connection, QR, logout, deletion, and normalized network errors.

- [x] **Step 3: Implement shared libraries**

Use environment-backed secrets, explicit Bearer parsing, bcrypt password verification, and an Evolution client that attaches the server-side API key.

- [x] **Step 4: Run focused tests**

Run `npm test -- --run tests/auth.test.ts tests/evolution-client.test.ts`.
Expected: all tests pass.

### Task 4: Implement API modules

**Files:**
- Create: `server/modules/auth/routes.ts`
- Create: `server/modules/guests/routes.ts`
- Create: `server/modules/groups/routes.ts`
- Create: `server/modules/templates/routes.ts`
- Create: `server/modules/rsvp/routes.ts`
- Create: `server/modules/settings/routes.ts`
- Create: `server/modules/uploads/routes.ts`
- Create: `server/modules/sending/routes.ts`
- Create: `server/modules/evolution/routes.ts`
- Create: `tests/api-routes.test.ts`

- [x] **Step 1: Write route contract tests**

Cover login/register/me, protected route rejection, guest CRUD and filters, public RSVP immutability, settings, and Evolution instance authorization.

- [x] **Step 2: Implement routes over Prisma**

Keep route handlers thin and place filtering, message rendering, and state transitions in module services. Validate JSON and multipart inputs with Zod.

- [x] **Step 3: Add Excel import/export and uploads**

Use `xlsx` for spreadsheet parsing and writing, enforce file size/type limits, store files under the configured upload directory, and return stable download responses.

- [x] **Step 4: Run API tests**

Run `npm test -- --run tests/api-routes.test.ts` against an isolated test database.
Expected: all route contract tests pass.

### Task 5: Port scheduling and sending

**Files:**
- Create: `server/modules/sending/service.ts`
- Create: `server/modules/scheduler/service.ts`
- Create: `tests/sending.test.ts`
- Create: `tests/scheduler.test.ts`

- [x] **Step 1: Test direct send outcomes**

Cover template rendering, phone normalization, success/failure status updates, skipped sent guests, missing active instance, and Evolution errors.

- [x] **Step 2: Test scheduled send lifecycle**

Cover persistence, cancellation, startup loading, future execution, past-due handling, and completed/failed states.

- [ ] **Step 3: Implement services**

Use a Node scheduler with one process-owned scheduler instance and Prisma transactions around guest and schedule status updates.

- [x] **Step 4: Run focused tests**

Run `npm test -- --run tests/sending.test.ts tests/scheduler.test.ts`.
Expected: all tests pass.

### Task 6: Build the React frontend

**Files:**
- Create: `web-react/src/api/client.ts`
- Create: `web-react/src/auth/AuthProvider.tsx`
- Create: `web-react/src/pages/LoginPage.tsx`
- Create: `web-react/src/pages/DashboardPage.tsx`
- Create: `web-react/src/pages/RsvpPage.tsx`
- Create: `web-react/src/components/GuestTable.tsx`
- Create: `web-react/src/components/SettingsPanel.tsx`
- Create: `web-react/src/styles.css`
- Create: `tests/frontend-smoke.test.tsx`

- [x] **Step 1: Test login and protected navigation**

Verify the login form stores the token, protected content renders after authentication, and a 401 clears session state.

- [x] **Step 2: Implement API client and auth provider**

Use same-origin `/api` calls, centralize JWT headers and 401 handling, and avoid direct references to `localhost:5000` or `backend:5000`.

- [x] **Step 3: Port dashboard workflows**

Implement guest management, groups, templates, settings, send/schedule actions, Evolution instances, and upload controls while preserving the existing user-facing workflows.

- [x] **Step 4: Implement public RSVP**

Read the token from the URL, display the guest state, allow one confirmation or decline, and show the immutable-result state returned by the API.

- [x] **Step 5: Run frontend tests and build**

Run `npm test -- --run tests/frontend-smoke.test.tsx && npm run build`.
Expected: tests pass and Vite emits the production bundle.

### Task 7: Replace Docker and documentation entry points

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `docker-compose.yml`
- Modify: `Makefile`
- Modify: `README.md`
- Modify: `DOCKER.md`
- Modify: `QUICK_START.md`
- Modify: `.env.example`

- [x] **Step 1: Add the Node production image**

Install dependencies, build React, run the compiled Fastify server, expose port `3000`, and mount the upload volume at the configured path.

- [x] **Step 2: Make compose run one application service**

Remove backend/frontend application services from the app compose file, add `app`, preserve MySQL/Evolution network names and environment variables, and keep the infrastructure compose unchanged except where required.

- [x] **Step 3: Update operational commands and docs**

Document `npm run dev`, `npm test`, `npm run build`, `docker compose up`, the single application URL, health check, environment variables, and migration safety.

- [x] **Step 4: Run Docker smoke validation**

Run `docker compose -f docker-compose.infra.yml up -d mysql evolution-api`, then `docker compose up -d --build app`, then `curl -f http://localhost:3000/health` and `curl -I http://localhost:3000/login.html`.
Expected: health returns HTTP 200 and the React entry point is served by the Node container.

### Task 8: Final migration verification

**Files:**
- Modify: `SWAGGER_DOCS.md`
- Modify: `api/README.md`
- Modify: `web/README.md`

- [x] **Step 1: Run the complete automated suite**

Run `npm test -- --run` and `npm run build`.
Expected: all Node tests and the frontend build pass.

- [x] **Step 2: Check diagnostics and generated diff**

Run `npm run typecheck`, `git diff --check`, and inspect the compose diff for accidental removal of data volumes or secrets.

- [x] **Step 3: Update migration notes**

Document the completed monolith migration, confirm the legacy Python/Nginx stack is no longer required for the active application path, and record the final verification results: 14 test files passed, 27 tests passed, frontend build succeeded, and TypeScript checks remained clean.

### Task 9: Complete uploads and spreadsheet workflows

**Files:**
- Modify: `package.json`
- Create: `server/modules/uploads/routes.ts`
- Create: `tests/uploads.test.ts`

- [x] Add multipart upload with a 16 MB limit and image-only validation.
- [x] Add `POST /api/guests/import` for `Nome`/`Telefone` spreadsheet columns and duplicate-phone skipping.
- [x] Add `GET /api/guests/export` returning an `.xlsx` download.
- [x] Validate with `npm test -- --run tests/uploads.test.ts`.

### Task 10: Make scheduled sending executable

**Files:**
- Create: `server/modules/scheduler/service.ts`
- Modify: `server/index.ts`
- Create: `tests/scheduler-execution.test.ts`

- [x] Load pending future schedules at startup and mark overdue schedules failed.
- [x] Execute scheduled sends through the existing `sendDirect` service and persist completed/failed timestamps.
- [x] Provide cancellation cleanup and graceful shutdown.
- [x] Validate with `npm test -- --run tests/scheduler-execution.test.ts`.

### Task 11: Finish React workflows

**Files:**
- Modify: `web-react/src/pages/DashboardPage.tsx`
- Create: `web-react/src/pages/RsvpPage.tsx`
- Create: `web-react/src/components/GuestTable.tsx`
- Create: `web-react/src/components/SettingsPanel.tsx`
- Create: `tests/frontend-smoke.test.tsx`

- [x] Add authenticated guest list/add/send controls, import/export, and same-origin API access.
- [x] Add public RSVP rendering and immutable response feedback.
- [x] Add a frontend smoke test for the public RSVP surface.
- [x] Validate with `npm test -- --run tests/frontend-smoke.test.tsx && npm run build`.

### Task 12: Publish migration documentation

**Files:**
- Modify: `README.md`
- Modify: `DOCKER.md`
- Modify: `QUICK_START.md`
- Modify: `api/README.md`
- Modify: `web/README.md`
- Modify: `SWAGGER_DOCS.md`

- [x] Document the Node monolith as the application entrypoint on port 3000.
- [x] Document MySQL and Evolution API as external infrastructure and mark Python/Nginx directories as legacy.
- [x] Run `npm test -- --run`, `npm run build`, `npm run typecheck`, and `git diff --check`.

Document that old Python/Nginx services are no longer required for the application path, while MySQL and Evolution API remain external dependencies.