# Implementation Plan - Brownfield Enhancements

This plan is derived from the Jira stories and tasks below. It is intentionally sequenced by dependencies (Database -> Backend API -> Frontend UI).

## Jira scope (links)

- EPMCDMETST-67646 - Search, filter, sort, and paginate courses: https://jiraeu.epam.com/browse/EPMCDMETST-67646
  - EPMCDMETST-67647: https://jiraeu.epam.com/browse/EPMCDMETST-67647
  - EPMCDMETST-67648: https://jiraeu.epam.com/browse/EPMCDMETST-67648
  - EPMCDMETST-67649: https://jiraeu.epam.com/browse/EPMCDMETST-67649
  - EPMCDMETST-67650: https://jiraeu.epam.com/browse/EPMCDMETST-67650
  - EPMCDMETST-67651: https://jiraeu.epam.com/browse/EPMCDMETST-67651
  - EPMCDMETST-67652: https://jiraeu.epam.com/browse/EPMCDMETST-67652
  - EPMCDMETST-67653: https://jiraeu.epam.com/browse/EPMCDMETST-67653
  - EPMCDMETST-67654: https://jiraeu.epam.com/browse/EPMCDMETST-67654

- EPMCDMETST-67655 - Enforce course ownership & standardize API errors: https://jiraeu.epam.com/browse/EPMCDMETST-67655
  - EPMCDMETST-67656: https://jiraeu.epam.com/browse/EPMCDMETST-67656
  - EPMCDMETST-67657: https://jiraeu.epam.com/browse/EPMCDMETST-67657
  - EPMCDMETST-67658: https://jiraeu.epam.com/browse/EPMCDMETST-67658
  - EPMCDMETST-67659: https://jiraeu.epam.com/browse/EPMCDMETST-67659
  - EPMCDMETST-67660: https://jiraeu.epam.com/browse/EPMCDMETST-67660
  - EPMCDMETST-67661: https://jiraeu.epam.com/browse/EPMCDMETST-67661
  - EPMCDMETST-67662: https://jiraeu.epam.com/browse/EPMCDMETST-67662

- EPMCDMETST-67663 - User profile update & password change: https://jiraeu.epam.com/browse/EPMCDMETST-67663
  - EPMCDMETST-67664: https://jiraeu.epam.com/browse/EPMCDMETST-67664
  - EPMCDMETST-67665: https://jiraeu.epam.com/browse/EPMCDMETST-67665
  - EPMCDMETST-67666: https://jiraeu.epam.com/browse/EPMCDMETST-67666
  - EPMCDMETST-67667: https://jiraeu.epam.com/browse/EPMCDMETST-67667
  - EPMCDMETST-67668: https://jiraeu.epam.com/browse/EPMCDMETST-67668
  - EPMCDMETST-67669: https://jiraeu.epam.com/browse/EPMCDMETST-67669
  - EPMCDMETST-67670: https://jiraeu.epam.com/browse/EPMCDMETST-67670

## High-level sequence & dependencies

1. Database / seed: indexes, constraints, seed data for pagination testing
2. Backend API: courses list query params, error standardization, ownership enforcement, user update endpoints
3. Frontend UI: search/sort/pagination controls, consistent error messaging, profile and password forms
4. Testing: API negative specs + UI E2E/tests

## Target files (expected, best-guess)

- Backend: `api/routes/courses.js`, `api/routes/users.js`, `api/app.js`
- Database: `api/db/models/Course.js`, `api/db/models/User.js`, `api/db/migrations/`, `api/seed/data/`
- Frontend: `client/src/components/Courses.jsx`, `client/src/components/Profile/**`, `client/src/utils/api.js`

## Verification checklist (story-level)

- EPMCDMETST-67646
  - GET /courses supports q, userId, sortBy/sortDir, page/pageSize, returns { data, meta.total }
  - UI can search, sort, paginate, shows empty-state

- EPMCDMETST-67655
   - POST /courses sets userId from auth user, ignores body.userId
  - GET /courses/:id returns 404 { error } when not found
  - PUTor DELETE non-owner returns 403 { error }
   - Unexpected errors map to 500 { error }

- EPMCDMETST-67663
  - PUT /users/me updates profile, validates unique email,"ÒC²W'&÷'2Ð¢ÒUB÷W6W'2öÖR÷77v÷&BfÆ–FFW27W'&VçE77v÷&BÂWFFW2†6‚Â 204 on success, 400 on bad current
