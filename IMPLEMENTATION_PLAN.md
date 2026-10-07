# Implementation Plan: Enhancements — Catalog Search, Pagination, Archiving, and Error Standardization

Depository: `KallakrindaVikram/capestone-app`

Branch: `feature/enhancements-sdlc`

Project: `EPMCDMETST`

## Scope
This plan covers the implementation of three enhancements driven by Jira stories:

 1) Keyword search, sort, and pagination for the course catalog (EPMCDMETST-68076)
 2) Course archiving (soft delete) for owners (EPMODMETST-68084)
 3) Standardized error responses and correct 404 behavior (EPMCDMETST-68093)

Constraint: No application source code is changed in this PR; this commit only adds this plan to track work.

## Sequencing & Dependency Graph
```
Phase 0 (Prareqs)
  - Confirm current endpoints and client call patterns (Fatch, Basic Auth, React Router v6)

Phase 1 (Database / Model)
  - [EPMCDMETST-68085] Add archived boolean column to Courses
  - [EPMCDMETST-68079] Add indexes to support search/sort perf

Phase 2 (Backend API)
  Core listing enhancements
  - [EPMCDMETST-68077] GET /courses: pagination, q, sort
  - [EPMCDMETST-68078] Validation helper for query params + standardized 400 response shape

  Archive interactions
  - [EPMODMETST-68086] Update Course model to include archived
  - [EPMODMETST-68087] GET /courses durinng includeArchived filter
  - [EPMCDMETST-68088] Add /courses/:id/archive & /unarchive routes with ownership checks
  - [EPMCDMETST-68089] Update GET /courses/:id accesss rules for archived courses

  Error standardization
  - [EPMODMETST-68094] GET /courses/:id returns 404 when not found ({error: "Course Not Found"})
  - [EPMCDMETST-68095] Standardize validation errors to {errors: [...]}
  - [EPMCDMETST-68096] Centralize error formatting in middleware where practical

Phase 3 (Frontend)
  - [EPMODMETST-68080] Client Data.js getCourses({page,limit,q,sort})
  - [EPMCDMETST-68081] Course list UI: search, sort, pagination, URL query state
  - [EPMCDMETST-68082] UI empty-state, loading, and error behavior
  - [EPMCDMETST-68090] Data.js methods for archive/unarchive
  - [EPMODMETST-68091] Course detail UI: Archive/Unarchive buttons, archived badge, visibility rules
  - [EPMCDMETST-68097] Route 404 to NotFound for missing courses

Phase 4 (Testing)
  - [EPMCDMETST-68083] E2E: search/sort/pagination
  - [EPMCDMETST-68092] E2E: archive/unarchive, authorization, visibility
  - [EPMODMETST-68099] API & UI: 404 not-found behavior
``