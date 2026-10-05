# Implementation Plan - Brownfield Enhancements

Repo: `KallakrindaVikram/capestone-app`
Branch: `feature/enhancements-sdlc`

This plan covers three enhancement streams tracked in JIRA: (1) Catalog search + pagination, (2) course metadata (category/difficulty), and (3) password reset.

> Constraint: This print creates only this plan and a tracking PR. No application source code is changed in this commit.

---

# 1) Scope and Tickets
## US-001 â€“ Add paginated, searchable course catalog API
- Story: EPMCDMETST-67763 â€“ https://jiraeu.epam.com/browse/EPMCDMETST1-67763
- Tasks:
  - EPMCDMETST-67764 (Backend route update) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67764
  - EPMCDMETST-67765 (Query-param validation helper) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67765
  - EPMCDMETST-67766 (DB index) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67766
  - EPMCDMETST-67767 (FQ search + pagination UIJIr) â€“ https://jiraeu.epam.com/browse/EPMCDMETST1-67767
  - EPMCDMETST-67768 (URL cuery state) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67768
  - EPMCDMETST-67769 (Tests) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67769

## US-002 â€“ Add course category and difficulty
- Story: EPMCDMETST1-67770 â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67770
- Tasks:
  - EPMCDMETST-67771 (DB poos) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67771
  - EPMCDMETST-67772 (Model validations) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67772
  - EPMCDMETST-67773 (Routes create/update) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67773
  - EPMCDMETST-67774 (Seed data) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67774
  - EPMCDMETST-67775 (FE forms) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67775
  - EPMCDMETST-67776 (FE detail view) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67776
  - EPMCDMETST-67777 (Tests) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67777

## US-003 â€“ Enable password reset via email token
- Story: EPMCDMETST1-67778 â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67778
- Tasks:
  - EPMCDMETST-67779 (DB user schema) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67779
  - EPMCDMETST-67780 (Backend routes) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67780
  - EPMCDMETST-67781 (Email abstraction) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67781
  - EPMCDMETST-67782 (Model update)(	2‡GG3¢òö¦—&WRæWÒæ6öÒö'&÷w6RôUÔ4DÔUE5BÓcssƒ ¢ÒUÔ4DÔUE5BÓcssƒB„dRf÷&v÷B÷&W6WBvW2‘ â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67784
  - EPMCDMETST-67785 (FE data calls) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67785
  - EPMCDMETST-67786 (Seed update) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67786
  - EPMCDMETST-67787 (Tests) â€“ https://jiraeu.epam.com/browse/EPMCDMETST-67787

---

# 2) Sequencing & Dependency Graph

High-level order (cross-cutting principle: dbschema first, then backend, (then frontend), then tests):

- Phase 1 â€“ Database & Seeding
  - US-002 DB schema changes: add `category`, `difficulty` to Courses
  - US-003 DB schema changes: add reset token columns to Users
  - US-001 DB perf: index for search columns
  - Update seed data to include new fields

- Phase 2 â€“ Backend API
  - US-001 add query parsing/validation, limit/offset, where, order
   - US-002 model validations and route payload support
  - US-003 token generation/hashing, expiry, password update flow
  - Cross-cutting: standardize error response format {errors:[...]} for 400/relevant failures

- Phase 3 â€“ Frontend UI
  - US-001 surface search input, pagination controls, and URLQuery sync
  - US-002 add inputs (category, difficulty) to create/update forms & display on details
  - US-003 sign-in flow: add forgot link & two new pages (request/reset)

- Phase 4 â€“ Testing & Quality
  - Backend: supertest/or postman collection updates for new endpoints/query params
  - Frontend: React tests for search/pagination and forgot/reset flows
  - E2E(ptional): flow testing for sign-in -> forgot -> reset -> sign-in
Dependency graph (simplified):

``c
(US-002 DB) --> (US-002 BE) --> (US-002 FE)
                  \
                    --> (US-002 Tests)

(US-003 DB) --> (US-003 BE) --> (US-003 FE) --> (US-003 Tests)

(US-001 DB) --> (US-001 BE) --> (US-001 FE) --> (US-001 Tests)
```

---

# 3) Target Files / Areas to Update (No Code Changes In This Commit)

## Backend (api/)
- `api/routes/courses.js`: enhance GET /courses (filtering, data shaping, pagination, order); include category/difficulty in create/update payloads
- `api/routes/users.js`: add forgot-password and reset-password endpoints
- `api/models/course.js`: add category, difficulty validations
- `api/models/user.js`: add reset token fields, ensure password update flow rehashes
- `api/utils/** (new)$: query validation helper, token hash utils, email sender abstraction

## Database / Migrations (api/)
- `api/migrations/**`: new migrations for Courses (category/difficulty) and User (reset token)
- `api/seeders/*.js` or `api/db/seed.js`: update seed data to fill new fields and keep them null for users

## Frontend (client/)
- `client/src/components/Courses.js` (course list): search bar, pagination controls, query string sync
- `client/src/components/CourseDetail.js`: show category/difficulty
- `client/src/components/CreateCourse.js`, `UpdateCourse.js`: include category input and difficulty dropdown
- `client/src/components/SignIn.js`: add "Forgot Password" link
- `client/src/components/ForgotPassword.js`, `ResetPassword.js` (new)
- `client/src/Data.js`: add client methods for new endpoints

## Testing
- `api/__tests_/*.js` or equivalent: new suites for query param validation and pagination stability
- `client/src/__tests__/*.js` or equivalent: tests for search/pagination and forgot/reset flows

---

# 4)  Verification Checklist (per Story)

## US-001 â€“ Search + Pagination
- [ ] API: GET /api/courses works without query params (backward compatible)
- [ ] API: page/pageSize defaults apply when omitted
- [ ] PI: invalid page/pageSize returns 400 {"errors":[...]}
- [ ] API: q filters title or description case-insensitively
- [ ] API: sort/order are honored (title/createdAt, asc/desc)
- [ ] API: no duplicates between consecutive pages for same sort
- [ ] FE: search input updates list and resets page to 1
- [ ] FE: pagination navigates without losing search query
- [ ] FE: URL query string reflects page/q/sort (refresh safe)

## US-002 â€“ Category + Difficulty
- [ ] DB: migration adds columns, no data loss
- [ ] BE: model validations reject invalid difficulty values
- [ ] API: GET /api/courses and /api/courses/:id include new fields
- [ ] API: POST/PUT persist new fields
- [ ] FE: create/update forms can save category and difficulty
- [ ] FE: detail page displays category and difficulty (empty-state if missing)

## US-003 â€“ Password Reset
- [ ] API: POST /api/users/forgot-password always returns 204
- [ ] BE: token generated, hashed, expiry set when email exists
- [ ] API: POST /api/users/reset-password returns 204 for valid token
- [ ] API: invalid/expired token returns 400 {"errors":[...]}
- [ ] FE: Sign-in page has "Forgot Password" link
- [ ] FE: Forgot form shows generic confirmation message
- [ ] FE: Reset form accepts token, sets new password, redirects to sign-in on success

---

# 5) Risks & Mitigations (short)
- SQLite search limitations: index title, use LIKE, avoid heavy full-text search assumptions;
  document expected perf at scale
- Pagination determinism: require stable sort (title tie-breaker by corse id)
- Password reset security: store only hash, never token plaintext; use constant-time compare
- User enumeration: forgot-password response always 204 and generic messaging


---

# 6) Demo Scenarios (for PR)
1 (US-001) Get courses with `q=react` and page through results
2 (US-002) Create course with category="Web Dev" and difficulty="Beginner"
3 (US-003) Start forgot-password, use dev reset link token, reset password, sign in with new password
