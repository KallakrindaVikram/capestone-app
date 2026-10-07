# Implementation Plan: Catalog Search, Pagination, and Course Status

> Branch: `feature/enhancements-sdlc`
> 
> Pull Request: "Enhancements: Catalog Search, Pagination, and Error Standardization" (tracking PR)

## Scope
This plan implements three Jira stories in a brownfield React + Express + Sequelize (SQLite) app:
- **EPMCDMETST-68021**: Search and filter courses
- **EPMCDMETST-68028**: Pagination and sorting
- **EPMCDMETST-68035**: Course lifecycle status (Draft/Published/Archived)

## Dependency Graph / Sequencing
**Phase 1 — Database & Seed Data (enables reliable local verification)**
- Add indexes to support title search/sort (**EPMCDMETST-68026**, **EPMCDMETST-68033**)
- Add `status` column + backfill rule (**EPMCDMETST-68041**)
- Expand seed dataset for search/pagination/status scenarios (**EPMCDMETST-68027**, **EPMCDMETST-68034**, **EPMCDMETST-68042**)

**Phase 2 — Backend API (unblocks UI integration)**
- Add `q` search param with sanitization/validation (**EPMCDMETST-68022**, **EPMCDMETST-68023**)
- Add pagination/sort params with validation and 400 errors (**EPMCDMETST-68029**, **EPMCDMETST-68030**)
- Add course `status` field support + visibility rules (**EPMCDMETST-68036**, **EPMCDMETST-68037**, **EPMCDMETST-68038**)

**Phase 3 — Frontend UI (consumes API)**
- Course list search UI + empty/loading/error states (**EPMCDMETST-68024**, **EPMCDMETST-68025**)
- Pagination controls + sort dropdown (**EPMCDMETST-68031**, **EPMCDMETST-68032**)
- Status selector in create/update forms + public visibility behavior (**EPMCDMETST-68039**, **EPMCDMETST-68040**)

## Target Files (expected)
> Exact paths may vary slightly; confirm in repo before implementation.

### Database / Sequelize
- `api/db/models/Course.js` (add `status` attribute + validation)
- `api/db/index.js` or migration folder (add migration or schema update scripts)
- `api/seed/*` or `api/db/seeders/*` (expand seed data)

### Backend (Express)
- `api/routes/courses.js` or `api/routes/index.js` (enhance GET /api/courses, PUT /api/courses/:id)
- `api/middleware/auth-user.js` (if needed for "anonymous" vs "authenticated" behavior detection)
- `api/middleware/async-handler.js` / `api/middleware/error-handler.js` (ensure 400 validation response format consistency)

### Frontend (React)
- `client/src/components/Courses.js` or equivalent course list component
- `client/src/components/CourseDetail.js`
- `client/src/components/CreateCourse.js`
- `client/src/components/UpdateCourse.js`
- `client/src/context/*` or API utility module that calls `/api/courses`

## Story-by-Story Checklist

### EPMCDMETST-68021 — Search and filter courses
**Backend (EPMCDMETST-68022, EPMCDMETST-68023)**
- [ ] Implement `q` query param on GET `/api/courses`
- [ ] Trim whitespace; enforce max length (e.g., 100 chars); ignore empty string
- [ ] Case-insensitive match on title OR description (Sequelize operator; SQLite-friendly)
- [ ] Return same fields/includes as current endpoint

**Frontend (EPMCDMETST-68024, EPMCDMETST-68025)**
- [ ] Add search input with submit and clear
- [ ] Wire API call with `q` param
- [ ] Loading indicator while fetching
- [ ] Empty state when no results
- [ ] Error state when API fails

**Database (EPMCDMETST-68026, EPMCDMETST-68027)**
- [ ] Add index on `courses.title` (and consider `description` if supported)
- [ ] Seed data includes distinct keywords across title/description

**Verification**
- [ ] Keyword finds matches in title
- [ ] Keyword finds matches in description
- [ ] Case-insensitive search works
- [ ] Clearing search returns full list
- [ ] No results shows empty state

### EPMCDMETST-68028 — Paginate and sort the course catalog
**Backend (EPMCDMETST-68029, EPMCDMETST-68030)**
- [ ] Support `page` (>=1) and `pageSize` (1..100) with defaults (1, 10)
- [ ] Apply `limit` and `offset`
- [ ] Support `sort` (allowlist: `title`, `createdAt` if present) and `order` (`asc`/`desc`)
- [ ] Invalid params return **400** with clear message(s)

**Frontend (EPMCDMETST-68031, EPMCDMETST-68032)**
- [ ] Add Next/Previous and current page indicator
- [ ] Disable Prev on page 1
- [ ] Add sort dropdown and refetch on change

**Database (EPMCDMETST-68033, EPMCDMETST-68034)**
- [ ] Ensure index on `courses.title`
- [ ] Seed at least 25+ courses to validate pages

**Verification**
- [ ] Page 1 returns <= pageSize
- [ ] Page 2 returns different items than page 1
- [ ] Sorting A-Z and Z-A works
- [ ] Invalid page/pageSize/sort/order returns 400

### EPMCDMETST-68035 — Course lifecycle status
**Database (EPMCDMETST-68041, EPMCDMETST-68042)**
- [ ] Add `status` column with default `Draft`
- [ ] Backfill existing rows (proposed rule: set existing to `Published` to preserve current public catalog)
- [ ] Seed mix of Draft/Published/Archived

**Backend (EPMCDMETST-68036, EPMCDMETST-68037, EPMCDMETST-68038)**
- [ ] Course model validation: only Draft/Published/Archived
- [ ] Create course default status = Draft (if not provided)
- [ ] GET `/api/courses` for anonymous: only Published
- [ ] GET `/api/courses?mine=true` for authenticated: only courses owned by current user (any status)
- [ ] PUT `/api/courses/:id` enforces ownership; non-owner => 403

**Frontend (EPMCDMETST-68039, EPMCDMETST-68040)**
- [ ] Create/Update forms include status selector for signed-in users
- [ ] Public course list hides Draft/Archived for anonymous users
- [ ] Optional "My Courses" toggle for signed-in users shows all their statuses

**Verification**
- [ ] New course defaults to Draft
- [ ] Anonymous sees only Published
- [ ] Authenticated mine=true returns only owned courses (any status)
- [ ] Owner can set status Published/Archived and save
- [ ] Non-owner cannot update status (403)

## Notes / Risks
- SQLite case-insensitive search: prefer `LIKE` with lowercased fields or Sequelize `Op.like` with `LOWER()` to ensure consistent behavior.
- Pagination UX: if total count is not returned by API, the UI can still support Next/Prev but may not know last page; consider adding `total` later (out of scope unless desired).

## Jira Links
- https://jiraeu.epam.com/browse/EPMCDMETST-68021
- https://jiraeu.epam.com/browse/EPMCDMETST-68022
- https://jiraeu.epam.com/browse/EPMCDMETST-68023
- https://jiraeu.epam.com/browse/EPMCDMETST-68024
- https://jiraeu.epam.com/browse/EPMCDMETST-68025
- https://jiraeu.epam.com/browse/EPMCDMETST-68026
- https://jiraeu.epam.com/browse/EPMCDMETST-68027
- https://jiraeu.epam.com/browse/EPMCDMETST-68028
- https://jiraeu.epam.com/browse/EPMCDMETST-68029
- https://jiraeu.epam.com/browse/EPMCDMETST-68030
- https://jiraeu.epam.com/browse/EPMCDMETST-68031
- https://jiraeu.epam.com/browse/EPMCDMETST-68032
- https://jiraeu.epam.com/browse/EPMCDMETST-68033
- https://jiraeu.epam.com/browse/EPMCDMETST-68034
- https://jiraeu.epam.com/browse/EPMCDMETST-68035
- https://jiraeu.epam.com/browse/EPMCDMETST-68036
- https://jiraeu.epam.com/browse/EPMCDMETST-68037
- https://jiraeu.epam.com/browse/EPMCDMETST-68038
- https://jiraeu.epam.com/browse/EPMCDMETST-68039
- https://jiraeu.epam.com/browse/EPMCDMETST-68040
- https://jiraeu.epam.com/browse/EPMCDMETST-68041
- https://jiraeu.epam.com/browse/EPMCDMETST-68042
