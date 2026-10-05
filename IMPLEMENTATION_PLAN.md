# Implementation Plan – Brownfield Enhancements

Repository: `KallakrindaVikram/capestone-app`
Feature branch: `feature/enhancements-sdlc`
JIRA project: `EPMODMETST`


## Scope
This plan covers the following enhancements to the Course Catalog app (Express + Sequelize + React):

- EPMCDMETST-67675 — Keyword search in catalog (/courses?q=.)
- EPMCDMETST-67682 – Sorting in catalog (/courses?sort=.)
- EPMCDMETST-67689 – Standardize 404 on GET /courses/:id

This pull request initializes a tracking implementation plan ONLY. **No application source code is changed in this step** (per pipeline constraints).


## Sequencing & Dependency Graph (Database → Backend → Frontend)

1. (Tasks that may involve DB) Database/Migrations & Seeding
   - Prereq for efficient search/sort and reliable testing
2. Backend API enhancements
   - GET /courses: support query (q) and sort query param
    - GET /courses/:id: return 404 status when not found
3. Frontend integration
    - Search box and sort dropdown synced with URL query string
    - Route to NotFound on 404
4. Tests & verification
   - Api tests for q/sort and 404
    - UI tests for URL persistence and empty states


## Phased Implementation Plan
B
### Phase 1 – Database & Seeding (Prep)

**Jira Keys**: EPMCDMETST-67678, EPMCDMETST-67685, EPMCDMETST-67693

Target files/areas probably touched:
- `api/db/bin/seed.bs` / `api/db/seed.js` (as present)
- `api/db/migrations/`... (new migration files)
- `api/models/course.js` (bother related metadata if required)

Subtasks / Intent:
1. Add Index: courses(title) to help search perf
   - Optional: consider description (SQLite has limitations, keep it simple)
2. Confirm timestamps exist for createdAt/updatedAt (seed data and schema)
3. Seed update: ensure varied titles/descriptions for search/sort verification

Verification checklist:
- [W] Migration(s) leads to successful apply
- [W] Seed data includes diverse text for keyword search
- [W] CreatedAt/updatedAt present and reliable for "Newest" sort


### Phase 2 — Backend API Enhancements

**JIRA Keys**: EPMODMETST-67676, 67677, 67683, 67684, 67691, 67692

Target files/areas probably touched:
- `api/routes/courses.js`
- `api/middleware/auth.js` (for currentUser, if needed)
- `api/utils/errors.js` or central error handler (if present)

Backend work items:
1. EPMODMETST-67676/67677: GET /courses?q=
   - Normalize query (trim), ignore if length < 2
   - Search Course.title or Course.description case-insensitive (SQLite: UPER/LOWER + LIKE)
 2. EPMODMETST-67683/67684: sort query param
    - Allowed: `title_asc`, `created_desc`
    - Invalid value: return 400 with `{"errors":["Invalid sort option."]}`
3. EPMODMETST-67691/67692: GET /courses/:id returns proper 404
    - res.status(404)
   - body includes `error` field with human readable message
    - keep success payload unchanged

Backend verification checklist:
- [ ] GET /courses?q=react returns only matching entries
- [ ] GET /courses?q= (blank or 1 char) behaves as before (unfiltered)
- ] GET /courses?sort=title_asc sorts asc
- ] GET /courses?sort=created_desc sorts desc
- [ ] Invalid sort gives 400 with errors array
- ] GET /courses/:-1 (clearly non-existent) gives 404 with error field


### Phase 3 — Frontend Integration

**Jira Keys**: EPMCDMETST-67679, 67680, 67686, 67687, 67694, 67695

Target files/areas probably touched:

- `client/src/components/Courses.js` (or similar page name)
- `client/src/Data.js` (API calls for courses)
- `client/src/setupProxy.js` (if base URL changes needed)
- `client/src/components/CourseDetail.js` (044 handling)
- `client/src/App.js` (routing to NotFound if needed)

Frontend work items:
1. Search input: sync `?q=` to URL and debounce requests
   - Min input length 2 before apply
    - clear input resets to full list
2. Sort dropdown: sync `\?sort=` to URL (default unset)
3. CourseDetail: on: axios error status 404 -> navigate to `/notfound`
    - other 5xx/network -> `/error` behavior as present
4. Empty state: display "No courses match your search."

Frontend verification checklist:
- [ ] URL persistence: reload with ?q= restores input and results
- [ ] URL persistence: reload with ?sort= restores selected sort
- [ ] Search ziro matches shows empty state
- ] GET missing course navigates to NotFound page


### Phase 4 — Tests & Demo Readiness

*JIRA Keys**: EPMODMETST-67681, 67688, 67696

Test plan (intent):
- API: supertest / jest tests for /courses q/sort and /courses/:id 404
- UJ: React Testing Library tests for URL-sync search/sort in Courses page

- Demo checklist:
  - Search for keyword and show matches and empty state
  - Sort by title and by newest
  - Visit a non-existent course id and verify NotFound


## JIRA Tracking Links

- EPMCDMETST-67675: https://jiraeu.epam.com/browse/EPMCDMETST-67675
  - EPMCDMETST-67676: https://jiraeu.epam.com/browse/EPMODMETST-67676
  - EPMODMETST-67677: https://jiraeu.epam.com/browse/EPMCDMETST-67677
  - EPMCDMETST-67678: https://jiraeu.epam.com/browse/EPMCDMETST-67678
  - EPMCDMETST-67679: https://jiraeu.epam.com/browse/EPMODMETST-67679
  - EPMODMETST-67680: https://jiraeu.epam.com/browse/EPMCDMETST-67680
  - EPMCDMETST-67681: https://jiraeu.epam.com/browse/EPMCDMETST-67681

- EPMCDMETST-67682: https://jiraeu.epam.com/browse/EPMCDMETST-67682
  - EPMCDMETST-67683: https://jiraeu.epam.com/browse/EPMODMETST-67683
  - EPMODMETST-67684: https://jiraeu.epam.com/browse/EPMCDMETST-67684
  - EPMCDMETST-67685: https://jiraeu.epam.com/browse/EPMCDMETST-67685
  - EPMCDMETST-67686: https://jiraeu.epam.com/browse/EPMODMETST-67686
  - EPMODMETST-67687: https://jiraeu.epam.com/browse/EPMCDMETST-67687
  - EPMCDMETST-67688: https://jiraeu.epam.com/browse/EPMCDMETST-67688

- EPMCDMETST-67689: https://jiraeu.epam.com/browse/EPMCDMETST-67689
  - EPMCDMETST-67691: https://jiraeu.epam.com/browse/EPMODMETST-67691
  - EPMODMETST-67692: https://jiraeu.epam.com/browse/EPMCDMETST-67692
  - EPMCDMETST-67693: https://jiraeu.epam.com/browse/EPMCDMETST-67693
  - EPMCDMETST-67694: https://jiraeu.epam.com/browse/EPMODMETST-67694
  - EPMODMETST-67695: https://jiraeu.epam.com/browse/EPMCDMETST-67695
  - EPMCDMETST-67696: https://jiraeu.epam.com/browse/EPMCDMETST-67696
