# Project Management frontend

A standalone Angular client for the existing Project Management API. All application reads and writes use the live API; there is no mock-data mode.

## Requirements and installation

Verified with Node **24.22.1**, npm **11.19.1**, Angular **22.2.4**, Angular CLI **22.2.6**, TypeScript **6.0.3**, and Vitest **5.1.0**. Dependency versions are pinned in `package.json` and `package-lock.json`.

From `project-management-fe/frontend`:

```powershell
npm ci
npm start
```

Open `http://localhost:4200/projects`. Start the existing Java backend separately at `http://localhost:8080`; consult its integration guide for backend setup. No backend code or configuration changes are required.

## API proxy and deployment

`npm start` runs `ng serve --proxy-config proxy.conf.json`. The development proxy forwards `/api/**` to `http://localhost:8080`. Services use the injectable `API_BASE_URL` token, defaulting to `/api/v1`. To point at another same-origin API path, override the token in `app.config.ts`. An absolute cross-origin URL also requires backend CORS configuration.

The development proxy is not included in production output. Configure your deployment server to proxy `/api` to the backend and serve `index.html` for frontend routes such as `/projects/10/tasks/3`. Serve the built browser assets from `dist/project-management/browser`.

## Build and tests

```powershell
npm run build
npm test -- --watch=false
```

`npm test` starts watch mode. Unit/component tests use Angular TestBed, Vitest, jsdom, and HttpClient testing; they do not connect to or modify the backend. They cover request contracts, envelopes and errors, date conversion, forms, dependency direction, status rules, health, and page refresh orchestration.

An optional live integration check requires both servers running:

```powershell
node scripts/live-smoke.mjs
```

This check creates a temporary project and three tasks, exercises CRUD, dependency direction/cycle checks, blocked progression, and cascading resets, and removes its own records in `finally`. It detects new records by comparing IDs before/after each create, rather than relying on names or returned mutation IDs. Run it without concurrent record creation. To use a different API URL, set `API_URL` before running it.

## Application behavior

- `/projects`: project list and inline create/edit forms.
- `/projects/:projectId`: derived project schedule/status and all tasks, with task CRUD.
- `/projects/:projectId/tasks/:taskId`: task details, status changes, incoming prerequisites, and outgoing dependent links.
- Project dates/status are read-only. Time left is the server's snapshot.
- Dates display in the browser's timezone. Local date forms preserve seconds/milliseconds and convert changed values to UTC ISO strings. Unchanged PATCH fields are omitted; empty descriptions clear existing text.
- A ? B means B depends on A. Eligible downstream choices come from dependable-list; prerequisites are derived from incoming links in the full project task list.
- Backward status changes require confirmation and reload all project tasks because downstream statuses can reset. Task changes also refresh the project summary.
- Mutation responses do not need an entity or ID. Failed saves retain inputs. A successful save followed by a failed refresh is reported separately; Retry only repeats reads.
- Forms, status, dependency, and deletion actions prevent overlapping saves. Close the active editor before manually refreshing.
- Health loads once and offers manual retry. There is no polling, authentication, Gantt chart, or additional backend endpoint.

## Structure

`src/app/core` contains API contracts, typed HTTP services, and pure date/dependency/status helpers. `src/app/pages` coordinates route data and mutations. `src/app/shared` contains reusable forms, tables, summaries, state components, confirmation dialogs, and the health indicator. Page state is local, with signals and cancellable RxJS requests; presentation components emit events instead of fetching data.

## Verification performed

- Production build passed.
- Frontend unit/component tests passed (see current test output for the count).
- Development proxy and frontend list/deep-link HTTP responses passed.
- Live API smoke check passed, including cleanup, deleted-resource reads, and the empty derived project schedule after deleting tasks.
- Interactive browser visual, narrow-screen, and keyboard walkthroughs were not run because browser automation/preview tools were unavailable. Responsive CSS, semantic controls, and dialog behavior are implemented; jsdom tests do not replace browser verification.
