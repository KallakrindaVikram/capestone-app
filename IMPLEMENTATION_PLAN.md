# Enhancements Implementation Plan
Repo: KallakrindaVikram/capestone-app
Branch: feature/enhancements-sdlc
Project: EPMCDMETST

Purpose: Implement three brownfield enhancements in a safe, incremental sequence (DB -> Backend -> Frontend -> Testing). This PR adds documentation only (no application code changes).

## Jira Links
- EPMCDMETST-67871: https://jiraeu.epam.com/browse/EPMCDMETST-67871
  - Tasks: EPMCDMETST-67872 https://jiraeu.epam.com/browse/EPMCDMETST-67872
           EPMCDMETST-67873 https://jiraeu.epam.com/browse/EPMCDMETST-67873
           EPMCDMETST-67874 https://jiraeu.epam.com/browse/EPMCDMETST-67874
           EPMCDMETST-67875 https://jiraeu.epam.com/browse/EPMCDMETST-67875
           EPMCDMETST-67876 https://jiraeu.epam.com/browse/EPMCDMETST-67876
           EPMCDMETST-67877 https://jiraeu.epam.com/browse/EPMCDMETST-67877
           EPMCDMETST-67878 https://jiraeu.epam.com/browse/EPMCDMETST-67878
           EPMCDMETST-67879 https://jiraeu.epam.com/browse/EPMCDMETST-67879
- EPMCDMETST-67880: https://jiraeu.epam.com/browse/EPMCDMETST-67880
  - Tasks: EPMCDMETST-67881 https://jiraeu.epam.com/browse/EPMCDMETST-67881
           EPMCDMETST-67882 https://jiraeu.epam.com/browse/EPMCDMETST-67882
           EPMCDMETST-67883 https://jiraeu.epam.com/browse/EPMCDMETST-67883
           EPMCDMETST-67884 https://jiraeu.epam.com/browse/EPMCDMETST-67884
           EPMCDMETST-67885 https://jiraeu.epam.com/browse/EPMCDMETST-67885
           EPMCDMETST-67886 https://jiraeu.epam.com/browse/EPMCDMETST-67886
- EPMCDMETST-67887: https://jiraeu.epam.com/browse/EPMCDMETST-67887
  - Tasks: EPMCDMETST-67888 https://jiraeu.epam.com/browse/EPMCDMETST-67888
           EPMCDMETST-67889 https://jiraeu.epam.com/browse/EPMCDMETST-67889
           EPMCDMETST-67890 https://jiraeu.epam.com/browse/EPMCDMETST-67890
           EPMCDMETST-67891 https://jiraeu.epam.com/browse/EPMCDMETST-67891
           EPMCDMETST-67892 https://jiraeu.epam.com/browse/EPMCDMETST-67892
           EPMCDMETST-67893 https://jiraeu.epam.com/browse/EPMCDMETST-67893
           EPMCDMETST-67894 https://jiraeu.epam.com/browse/EPMCDMETST-67894
           EPMCDMETST-67895 https://jiraeu.epam.com/browse/EPMCDMETST-67895

## Sequence & Dependency Graph
Phase 1 (DB & Seeding prerequisites)
1. [EPMCDMETST-67888] Favorites join table + unique constraint (userId, courseId).
2. [EPMCDMETST-67878] Document/implement search indexing strategy (SQLite-friendly).
3. [EPMCDMETST-67885, 67889] Seed updates to keep demo data consistent.

Phase 2 (Backend API enhancements)
1. [EPMCDMETST-67881, 67882, 67883] Enforce authenticated course ownership (ignore userId in payload, whitelist fields, consistent 400/403).
2. [EPMCDMETST-67872, 67873, 67874, 67875] GET /api/courses: q/userId filters, sort mapping, pagination, X-Total-Count header, validation.
3. [EPMCDMETST-67890, 67891] Favorites endpoints (GET /users/me/favorites; POST/DELETE /courses/:id/favorite) with idempotency.

Phase 3 (Frontend integration)
1. [EPMCDMETST-67876, 67877] Courses list: search, sort, pagination UI; URL query string sync; loading + empty-state.
2. [EPMCDMETST-67884] Create/Edit forms omit userId in payload.
3. [EPMCDMETST-67892, 67893, 67894] Favorite toggle on Course Detail; My Favorites page; auth-guarded nav.

Phase 4 (Testing & quality gates)
1. [EPMCDMETST-67879] API/UI tests for search/sort/pagination/empty-state and X-Total-Count.
2. [EPMCDMETST-67886] Ownership enforcement tests (spoofed userId ignored; 403 for non-owner).
3. [EPMCDMETST-67895] Favorites tests (unique constraint/idempotency, auth, My Favorites page).

## Target Files (expected, to confirm in repo)
Backend (Express + Sequelize)
- api/routes/courses.js (GET query, POST ownership, PUT whitelist, favorite subroutes)
- api/routes/users.js (GET /me/favorites)
- api/models/user.js, api/models/course.js, api/models/favorite.js (new)
- api/models/index.js (associations)
- api/seeders/* (seed updates)

Frontend (React)
- client/src/components/Courses.js (search/sort/pagination)
- client/src/components/CourseDetail.js (favorite toggle)
- client/src/components/MyFavorites.js (new)
- client/src/Routes.js (route wiring)
- client/src/components/Header.js (conditional nav)

## Verification Checklist (by story)
EPMCDMETST-67871
- API supports q, userId, sort, page, pageSize.
- API returns X-Total-Count of matched courses.
- API validates page/pageSize and enforces max pageSize.
- UI syncs state to URL; shows loading and empty-state.

EPMCDMETST-67880
- POST assigns userId from authenticated user; ignores spoofed userId.
- PUT ignores userId changes; only owner can PUT/DELETE (403 otherwise).
- UI never sends userId.

EPMCDMETST-67887
- Favorites join table has unique (userId, courseId).
- POST/DELETE favorite is idempotent; 404 when course missing; 401 when unauthenticated.
- UI supports favorite toggle and My Favorites page; unauth users redirected to Sign In.
