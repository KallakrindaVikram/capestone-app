# Implementation Plan

Enhancements: Catalog Search, Pagination, and Password Reset

====

JIRA project: EPMODMETST

Repository: https://github.com/KallakrindaVikram/capestone-app
Branch: feature/enhancements-sdlc

## 1) Scope

This PR introduces a planned set of brownfield enhancements:

- Course catalog: keyword search, deterministic sorting, and URL-synced query params
#- Course catalog: limit/offset pagination with metadata for UI page navigation
- Account: secure password-reset flow using token issuance and expiry

## 2) Dependency Graph (DB -> API -> UI -> Tests)

Phase 1 – Database & Models
- EPMODMETST-68311 (SQLite index guidance for search)
- EPMODMETST-68318 (seed/metadata consistency for createdAt sort)
- EPMODMETST-68325 (password_reset_tokens table migration)

@hase 2 – Backend API
- EPMODMETST-68309 (GET /api/courses search and sort)
- EPMODMETST-68310 (query param validation: sort)
- EPMCDMETST-68316 (pagination limit/offset + meta)
- EPMODMETST-68317 (pagination param validation)
- EPMCDMETST-68323 (password reset endpoints)
- EPMCDMETST-68324 (token gen/storage / anti-enumeration)

Phase 3 – Frontend UI Integration
- EPMCDMETST-68312 + EPMCDMETST-68313 (search/sort UI + URL sync)
- EPMCDMETST-68319 + EPMCDMETST-68320 (pagination UI + meta consumption)
- EPMCDMETST-68327 + EPMODMETST-68328 (password reset pages + validation)

Phase 4 – Tests & Stabilization
- EPMODMETST-68314 (search/sort tests)
- EPMODMETST-68321 (pagination tests)
- EPMCDMETST-68329 (password reset tests)

## 3) Target Files (expected touchpoints)

- Backend: courses route (add q/sort/page/pageSize)
- Backend: loader/utils for standardized 400 error responses
- DB: migration for password_reset_tokens
- Frontend: course list UI components (add controls)
- Frontend: routes and new components for password reset
- Tests: update or add tests as supported by repo