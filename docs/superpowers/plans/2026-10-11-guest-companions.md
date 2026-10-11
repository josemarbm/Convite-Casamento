# Acompanhantes por Convite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Use checkbox steps for tracking; run each focused test before broadening validation.

**Goal:** Allow each primary guest to have a configurable companion limit and named companions, collect the final companion list during the one-time RSVP, include confirmed companions in event headcounts, and preserve the fields in Excel import/export.

**Architecture:** Keep `Guest` as the invitation/contact owner and add a dependent `GuestCompanion` table for names. Validate and replace companion lists atomically in authenticated guest CRUD and token-authorized RSVP routes; never create separate phone invitations or RSVP tokens for companions. Extend event summaries and spreadsheets from the related records without changing existing primary-guest or group counts.

**Tech Stack:** Prisma/MySQL, Fastify, React 19/TypeScript, Vitest, SheetJS (`xlsx`).

---

## Files and Responsibilities

- `prisma/schema.prisma` — add `Guest.companionLimit` and the dependent `GuestCompanion` model.
- `server/modules/guests/routes.ts` — serialize, validate, create, and replace companion names within event-scoped guest CRUD.
- `server/modules/rsvp/routes.ts` — return companions for a token and atomically save the initial RSVP and companion list.
- `server/modules/events/routes.ts` — calculate confirmed people per active event while retaining guest RSVP totals.
- `server/modules/uploads/routes.ts` — parse and emit companion allowance/names in event-scoped spreadsheets.
- `web-react/src/pages/DashboardPage.tsx` — manage companion limit/name state in the add/edit form and guest API payloads.
- `web-react/src/components/GuestList.tsx` — show each guest's companion allowance and registered name count.
- `web-react/src/components/CompanionEditor.tsx` — shared controlled name-list editor for administration and RSVP, with add/remove controls constrained by the limit.
- `web-react/src/pages/RsvpPage.tsx` — collect or edit companion names before the RSVP is submitted, then retain the existing locked-after-response behavior.
- `web-react/src/events/EventProvider.tsx` — type the new confirmed-people event field.
- `web-react/src/components/EventOverview.tsx` — present confirmed primary guests and total confirmed people distinctly.
- `tests/prisma-schema.test.ts`, `tests/guests-routes.test.ts`, `tests/rsvp-routes.test.ts`, `tests/events-routes.test.ts`, `tests/uploads.test.ts`, `tests/frontend-smoke.test.tsx` — add schema, API, spreadsheet, metric, and rendering coverage in their existing suites.

## Task 1: Add Companion Persistence

**Files:** `prisma/schema.prisma`, `tests/prisma-schema.test.ts`

- [ ] Add a failing schema test asserting `companionLimit`, relation `companions`, model `GuestCompanion`, `guestId`, `name`, `onDelete: Cascade`, and mapped table `guest_companions`.
- [ ] Run `npx vitest run tests/prisma-schema.test.ts`; confirm it fails because the companion fields/model are absent.
- [ ] Add `companionLimit Int @default(0) @map("companion_limit")` and `companions GuestCompanion[]` to `Guest`. Add `GuestCompanion` with autoincrement `id`, required `guestId`, `name String @db.VarChar(200)`, cascading relation to `Guest`, index on `guestId`, and `@@map("guest_companions")`.
- [ ] Run `npx prisma format`, `npx prisma generate`, and `npx vitest run tests/prisma-schema.test.ts`; expect all schema tests to pass.

## Task 2: Extend Guest CRUD and Administration API

**Files:** `server/modules/guests/routes.ts`, `tests/guests-routes.test.ts`

- [ ] Add route tests for default limit zero, valid names at the limit, a list above the limit returning 400, invalid negative/fractional/non-numeric limits returning 400, and event scoping of the parent guest.
- [ ] Run `npx vitest run tests/guests-routes.test.ts`; confirm the new contract tests fail before production changes.
- [ ] Extend guest request bodies with optional `companion_limit` and `companions: string[]`; serialize `companion_limit` and `companions` in guest responses and include companion relations in list/create/update queries.
- [ ] Normalize names by trimming and dropping empty strings; require all provided items to be strings of at most 200 characters. Validate limit as an integer in `[0, 2147483647]` and reject when normalized name count exceeds it.
- [ ] On create, persist the guest and child rows in one Prisma transaction. On update, resolve the guest by both id and active `eventId`; if companion fields are omitted preserve stored values, if names are supplied replace the list atomically, and reject a reduced limit below the retained/replacement list size.
- [ ] Run `npx vitest run tests/guests-routes.test.ts`; expect validation, event isolation, response, and replacement tests to pass.

## Task 3: Add Companion Names to the One-Time RSVP

**Files:** `server/modules/rsvp/routes.ts`, `tests/rsvp-routes.test.ts`

- [ ] Add failing tests that GET returns `companion_limit` and names, a valid initial confirmation accepts names up to the limit, over-limit names return 400 without writes, a transaction failure preserves the prior RSVP/list, decline remains a single primary response, and retrying an answered RSVP still returns 409.
- [ ] Run `npx vitest run tests/rsvp-routes.test.ts`; verify the new assertions fail before implementation.
- [ ] Include companion rows in the token lookup and response. Accept optional `companions` in POST; validate its shape, trim/drop blank strings, enforce 200-character names and the guest's limit before writes.
- [ ] For confirmed submissions that include `companions`, update RSVP fields and replace companion rows inside one Prisma `$transaction`. When the field is omitted, preserve existing companion names for legacy clients. On declined submissions preserve names but count none as attending. Keep the existing 409 lock after a response.
- [ ] Run `npx vitest run tests/rsvp-routes.test.ts`; expect RSVP read/write, bounds, token, and one-time response behavior to pass.

## Task 4: Add Companion Controls to Guest Administration

**Files:** `web-react/src/pages/DashboardPage.tsx`, `web-react/src/components/GuestList.tsx`, `web-react/src/components/CompanionEditor.tsx`, `tests/frontend-smoke.test.tsx`

- [ ] Extend the frontend guest type with `companion_limit` and `companions`; add component rendering assertions that show a guest's companion usage and that zero-limit guests have none.
- [ ] Create a controlled `CompanionEditor` accepting `{ limit, names, onChange, disabled? }`; render one text input per current name, an add control only while `names.length < limit`, and a remove control per row. Add a component test for the zero-limit and at-limit states.
- [ ] Add form state for limit and names. Reset it on cancel/success/event change; populate it from a selected guest while editing; render the shared editor in create/edit mode.
- [ ] Add a nonnegative integer limit input and name fields with add/remove controls. Only add names while count is below the limit; allow editing/removing existing names; disable save when fields exceed the limit or contain invalid input.
- [ ] Include `companion_limit` and trimmed non-empty `companions` in create/update requests. Display a clear API validation message when a server-side check rejects the list.
- [ ] Run `npx vitest run tests/frontend-smoke.test.tsx tests/guests-routes.test.ts` and `npm run typecheck`; expect both to pass.

## Task 5: Collect Companion Names in Public RSVP

**Files:** `web-react/src/pages/RsvpPage.tsx`, `web-react/src/components/CompanionEditor.tsx`, `tests/frontend-smoke.test.tsx`, `tests/rsvp-routes.test.ts`

- [ ] Add frontend coverage for the RSVP's companion allowance and name-entry controls when data is available; retain the existing loading and answered-state assertions.
- [ ] Extend the RSVP type with `companion_limit` and `companions`, initialize editable names from GET, and render the shared editor only while status is `pending` and limit is greater than zero.
- [ ] On confirmation, submit `{ response: 'confirmed', companions: trimmedNonEmptyNames }`; on decline submit only `{ response: 'declined' }`. Do not render editable controls after the existing one-time response lock.
- [ ] Show the number of allowed companions and current count, disable adding at the limit, and present server validation errors without discarding local input.
- [ ] Run `npx vitest run tests/frontend-smoke.test.tsx tests/rsvp-routes.test.ts` and `npm run typecheck`; expect all focused checks to pass.

## Task 6: Include Companions in Confirmed-People Metrics

**Files:** `server/modules/events/routes.ts`, `web-react/src/events/EventProvider.tsx`, `web-react/src/components/EventOverview.tsx`, `tests/events-routes.test.ts`, `tests/frontend-smoke.test.tsx`

- [ ] Add failing API tests with confirmed and non-confirmed guests and companion counts; assert `confirmed_count` remains primary guests and `confirmed_attendee_count` adds companions only for confirmed guests.
- [ ] Run `npx vitest run tests/events-routes.test.ts`; verify the added metric is missing before implementation.
- [ ] Query confirmed guests for the active events with their companion counts, aggregate by `eventId`, and return `confirmed_attendee_count = confirmed_count + confirmed companions`; preserve current event-scoped `guest_count`, RSVP grouped totals, and zero-event behavior.
- [ ] Add `confirmed_attendee_count` to `ManagedEvent`; present the people total distinctly from primary confirmed guests in the overview and event rows.
- [ ] Run `npx vitest run tests/events-routes.test.ts tests/frontend-smoke.test.tsx` and `npm run typecheck`; expect focused checks to pass.

## Task 7: Round-Trip Companion Data in Excel

**Files:** `server/modules/uploads/routes.ts`, `tests/uploads.test.ts`

- [ ] Add failing tests for optional Portuguese/English headers `Limite de acompanhantes`/`Companion limit` and `Acompanhantes`/`Companions`; test semicolon-separated names, absent columns defaulting to zero/empty, invalid/negative/fractional limit, names over the limit, companion names over 200 characters, duplicate-phone skipping, and exported values.
- [ ] Run `npx vitest run tests/uploads.test.ts`; verify the new field assertions fail before implementation.
- [ ] Normalize Excel values to a validated nonnegative integer limit and a trimmed name list split on `;`. If fields are absent use zero and an empty list. Keep current required name/phone handling, event scoping, duplicate-phone check, and status columns informational.
- [ ] Ignore an entire import row and increment `skipped` if its limit is invalid, any companion name exceeds 200 characters, or its parsed name count exceeds the limit. For valid new guests, create the guest and its companions atomically; do not update existing phone duplicates.
- [ ] Export `Limite de acompanhantes` and `Acompanhantes` alongside current columns; join names with `; `, and include companions in the event-scoped query.
- [ ] Run `npx vitest run tests/uploads.test.ts`; expect old spreadsheet compatibility, invalid-row accounting, duplicates, and round-trip export to pass.

## Task 8: Integrated Verification and Database Rollout Gate

**Files:** all files in the tasks above; `docs/superpowers/specs/2026-10-11-guest-companions-design.md`

- [ ] Run focused suites in dependency order: `npx vitest run tests/prisma-schema.test.ts tests/guests-routes.test.ts tests/rsvp-routes.test.ts tests/events-routes.test.ts tests/uploads.test.ts tests/frontend-smoke.test.tsx`.
- [ ] Run `npm run typecheck`, `npm test -- --run`, and `npm run build`; require zero failures and a successful production build.
- [ ] Validate Prisma generation and schema. Apply `npx prisma db push` only against an explicitly configured disposable or approved non-production database during implementation; production rollout requires the normal backup/change approval and must not be run automatically as part of tests.
- [ ] Confirm legacy guests have limit zero, existing tokens still work, old spreadsheet columns remain accepted, and RSVP remains locked after first submission.
