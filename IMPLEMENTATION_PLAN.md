# Implementation - Enhancements: Catalog Search, Pagination, and 404 Standardization

Project: EPMCDMETST 
Repository: KallakrindaVikram/capestone-app
Branch: feature/enhancements-sdlc

# Stories (Jira)
- EPMCDMETST-67624: Search and filter courses (main US)
  - Tasks: EPMOCDMETST-67625, EPMCDMETST-67626, EPMCDMETST-67627, EPMCDMETST-67628
- EPMCDMETST-67629: Paginate the course catalog (main US)
  - Tasks: EPMOCDMETST-67630, EPMCDMETST-67631, EPMCDMETST-67632, EPMCDMETST-67633
- EPMCDMETST-67634: Standardize 404 behavior for missing courses
  - Tasks: EPMCDMETST-67635, EPMCDMETST-67636, EPMCDMETST-67637, EPMCDMETST-67638

## Dependency graph
Db/Seed > Backend API > Frontend UI

## Phase 1 – Database/Seed (Prep)
- EPMOCDMETST-67628: Seed adds >= 3 courses with distinct keywords for deterministic search testing
- EPMCDMETST-67633: Seed expands to >= 25 courses (pagination verification)
- EPMCDMETST-67638: Deterministic non-existent course id strategy for tests (e.g. maxId + 999)

## Phase 2 – Backend API (Express + Sequelize)
*Target file:* api/routes/courses.js 
- EPMCDMETST-67625: Add q= query param search across title/description (case-insensitive)
- EPMCDMETST-67626: Validate q is a string;"[Bad type] => 400 { errors: [...] }
- EPMCDMETST-67630: Implement page/pageSize limit/offset; defaults page=1, pageSize=20; stable ordering by id ASC
- EPMCDMETST-67631: Validate page/pageSize (page<1, pageSize<1, pageSize>100, non-integers) => 400 { errors: [...] }
- EPMCDMETST-67635: GET /courses/:id missing => 404 { error: "Course Not Found" } (not 200)
- EPMCDMETST-67636: PUT/DELETE missing => same 404 payload

## Phase 3 – Frontend Integration (React)
*Target files (tentative):* client/src/components/Courses.js, client/src/components/CourseDetail.js, client/src/Routes.js
- EPMCDMETST-67627: Add search input + debounce; sync q in URL query
- EPMCDMETST-67632: Add Next/Previous; sync page/pageSize/q in URL and fetch paged
- EPMCDMETST-67637: On 404 from CourseDetail, route to /notfound

## Verification checklist
- US-001: GET /courses?q= returns only case-insensitive matches; no-match => 200 []; invalid q => 400 { errors: [...] }
- US-002: GET /courses?page&pageSize limits results; page 2 no duplicates; invalid params => 400
- US-003: GET/PUT/DELETE missing id => 404 { error: "Course Not Found" }; frontend navigates NotFound
