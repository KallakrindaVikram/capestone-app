# Implementation Plan: Catalog Search, Pagination, Filter/Sort, and Favorites

Brownfield enhancements for the capestone app (Full Stack Course Catalog - React + Node/Express + Sequelize + SQLite).

This document is a tracking plan only. **No application source code changes are made in this PR**.

## Scope
- **US-001 / EPMCDMETST-68331:** Search courses by keyword with paginated results
- **US-002 / EPMCDMETST-68339:** Filter and sort courses on the course list
- **US-003 / EPMCDMETST-68347:** Favorite courses for quick access

## Kick-off Sequence & Dependency Graph
Core principle: **Database & seeds -> Backend API -> Frontend UI -> Tests & Docs (integration)**.

1. **DB/Migrations**
   - Favorites join table
   - Indexes for search and filtering
   - Seed data expansion for pagination/filters/favorites

2. **Backend API**
   - GET /courses: q, page, pageSize, ownerId, sort
   - Pagination metadata in response
   - Favorites endpoints and optional isFavorited

3. **Frontend UI**
   - Search box, clear, empty state
   - Pagination controls & URL query sync
   - Owner filter & sort controls
   - Favorite toggle & My Favorites page

4. **Testing & Verification**
   - API tests for query params, validation, and auth
   - UI tests for list behaviors and favorites

## Target Files / Directories (expected)
Note: planning-level; filenames may vary slightly based on repo structure.

### Backend (Express + Sequelize)
- `api/models/Course.js` or `api/models/index.js`: update model relationships for Favorites join table
- `api/models/Favorite.js` (new): join model
- `api/migrations/*`: add Favorites table + constraints + indexes
- `api/routes/courses.js` (or similar): extend GET /courses and add favorite routes
- `api/routes/users.js` (or similar): add GET /users/me/favorites

### Frontend (React)
- `client/src/components/Courses.js` (or `CoursesList.js`): add search, empty state, pagination, filter/sort UI
- `client/src/components/CourseDetail.js`: add Favorite toggle
- `client/src/components/MyFavorites.js` (new): favorites list page
- `client/src/App.js` or router config: add route for `/favorites`
- `client/src/Data.js`: extend API client calls for new query params and new endpoints

### Testing
- `client/src/__tests__/*` or `client/src/components/__tests__/*`: RTL tests for list behaviors and favorites
- `api/tests/*` (if present) or Postman/README docs updates

## Detailed Work Plan by Story

### US-001 / EPMCDMETST-68331 — Search + Pagination
Jira: https://jiraeu.epam.com/browse/EPMCDMETST-68331

**Backend**
- EPMCDMETST-68332: implement `q`, `page`, `pageSize` query params in `GET /courses`
- EPMCDMETST-68333: return pagination metadata (e.g., `{ items, page, pageSize, totalCount, totalPages }`)
- EPMCDMETST-68334: add index on `Courses.title` (and optionally description where appropriate)

**DB/Seed**
- EPMCDMETST-68335: expand seed dataset (>20 courses, keyword diversity)

**Frontend**
- EPMCDMETST-68336: search input (submit + clear)
- EPMCDMETST-68337: pagination controls + URL query string sync

**Testing**
- EPMCDMETST-68338: UI + API tests for search/pagination/empty state

**Verification checklist**
- Search matches title/description case-insensitively
- Clear search restores full list
- Prev/Next disabled correctly; invalid page -> page=1
- Empty state when 0 results

---

### US-002 / EPMCDMETST-68339 — Filter + Sort
Jira: https://jiraeu.epam.com/browse/EPMCDMETST-68339

**Backend**
- EPMCDMETST-68340: implement `ownerId` + `sort` params; validate allowed values
- EPMCDMETST-68341: ensure server-side sorting consistency (optionally return `sortApplied`)

**DB/Seed**
- EPMCDMETST-68342: add index on `Courses.userId`
- EPMCDMETST-68343: seed multiple users with multiple courses

**Frontend**
- EPMCDMETST-68344: owner filter dropdown + sort dropdown
- EPMCDMETST-68345: Data.js + router query sync for ownerId/sort

**Testing**
- EPMCDMETST-68346: UI + API tests for filter/sort and URL persistence

**Verification checklist**
- Owner filter applies correctly
- Sort applies to filtered results
- Invalid sort defaults to Newest
- URL query reflects state and persists on reload

---

### US-003 / EPMCDMETST-68347 — Favorites
Jira: https://jiraeu.epam.com/browse/EPMCDMETST-68347

**Database**
- EPMCDMETST-68348: Favorites join table with unique (userId, courseId) + FK cascade delete

**Backend**
- EPMCDMETST-68349: endpoints POST/DELETE /courses/:id/favorite and GET /users/me/favorites (auth required)
- EPMCDMETST-68350: optionally enrich course detail with `isFavorited` when authenticated

**DB/Seed**
- EPMCDMETST-68351: seed sample favorites

**Frontend**
- EPMCDMETST-68352: favorite toggle on course detail (optimistic UI + rollback)
- EPMCDMETST-68353: My Favorites page/route

**Testing**
- EPMCDMETST-68354: UI + API tests (auth, uniqueness, cascade delete)

**Verification checklist**
- Auth required for favorite/unfavorite; unauth redirects to sign-in
- My Favorites shows only favorited courses
- Cascade deletes remove orphan favorites

## Jira Tickets Included (links)
- EPMCDMETST-68331 https://jiraeu.epam.com/browse/EPMCDMETST-68331
- EPMCDMETST-68332 https://jiraeu.epam.com/browse/EPMCDMETST-68332
- EPMCDMETST-68333 https://jiraeu.epam.com/browse/EPMCDMETST-68333
- EPMCDMETST-68334 https://jiraeu.epam.com/browse/EPMCDMETST-68334
- EPMCDMETST-68335 https://jiraeu.epam.com/browse/EPMCDMETST-68335
- EPMCDMETST-68336 https://jiraeu.epam.com/browse/EPMCDMETST-68336
- EPMCDMETST-68337 https://jiraeu.epam.com/browse/EPMCDMETST-68337
- EPMCDMETST-68338 https://jiraeu.epam.com/browse/EPMCDMETST-68338
- EPMCDMETST-68339 https://jiraeu.epam.com/browse/EPMCDMETST-68339
- EPMCDMETST-68340 https://jiraeu.epam.com/browse/EPMCDMETST-68340
- EPMCDMETST-68341 https://jiraeu.epam.com/browse/EPMCDMETST-68341
- EPMCDMETST-68342 https://jiraeu.epam.com/browse/EPMCDMETST-68342
- EPMCDMETST-68343 https://jiraeu.epam.com/browse/EPMCDMETST-68343
- EPMCDMETST-68344 https://jiraeu.epam.com/browse/EPMCDMETST-68344
- EPMCDMETST-68345 https://jiraeu.epam.com/browse/EPMCDMETST-68345
- EPMCDMETST-68346 https://jiraeu.epam.com/browse/EPMCDMETST-68346
- EPMCDMETST-68347 https://jiraeu.epam.com/browse/EPMCDMETST-68347
- EPMCDMETST-68348 https://jiraeu.epam.com/browse/EPMCDMETST-68348
- EPMCDMETST-68349 https://jiraeu.epam.com/browse/EPMCDMETST-68349
- EPMCDMETST-68350 https://jiraeu.epam.com/browse/EPMCDMETST-68350
- EPMCDMETST-68351 https://jiraeu.epam.com/browse/EPMCDMETST-68351
- EPMCDMETST-68352 https://jiraeu.epam.com/browse/EPMCDMETST-68352
- EPMCDMETST-68353 https://jiraeu.epam.com/browse/EPMCDMETST-68353
- EPMCDMETST-68354 https://jiraeu.epam.com/browse/EPMCDMETST-68354
