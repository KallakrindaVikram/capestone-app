# Enhancements Implementation Plan
Repo: `KallakrindaVikram/capestone-app`
Branch: `feature/enhancements-sdlc`
Project: `EPMCDMETST`

This document tracks the step-by-step implementation plan for the Brownfield enhancements covering:
1) Search courses by title/description
2) Filter courses by author (creator)
3) Sort courses by title or last updated date

---

## Jira Links

- EPMCDMETST-68186: https://jiraeu.epam.com/browse/EPMODMETST-68186
- EPMCDMETST-68196: https://jiraeu.epam.com/browse/EPMCDMETST-68196
- EPMODMETST-68208: https://jiraeu.epam.com/browse/EPMCDMETST-68208

---

## High-Level Sequence (Dependency Aware)

1 Database: add indexes + seed data for deterministic demo
2 Backend:"GET /api/courses" supports q, userId, sort, order
 3 Frontend: course list page adds search + author filter + sort; state persisted in URL chain
-4 Testing: add E2e tests for search/filter/sort

---

## Per-Story Checklists (condensed)

### EPMCDMETST-68186 – Search
- [W ] BE: q param support (sanitize trim, max length), 400 on invalid
- [] FE: search input, URL `q=` sync, no-results empty-state
- [] Tests: e2e covers search success, reset, empty results

### EPMCDMETST-68196 – Author Filter
- [] BE: userId query param, validate positive int, 400 on invalid
- [] FE: Author dropdown, URL `userId=` sync, reset to All
- [] UX: empty list for non-existent userId

### EPMCDMETST-68208 – Sort
- [] BE: sort=title|updatedAt, order=asc|desc, 400 on invalid
- [] BE: list response includes updatedAt for sort verification
- [] FE: sort dropdown, URL `sort= &order=` sync
- [] Tests: e2e verifies ordering for both sort options
