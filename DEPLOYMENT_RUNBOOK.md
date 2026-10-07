# Local Deployment Runbook (Localhost: API 5000, UI 3000)

> **Document Intent**: This runbook describes how to deploy the capestone-app locally (production-ready local deployment) using the approved, tested PR build on the target branch. It includes pre-flight checks, backend deployment (Express + SQLite), frontend build + serving, smoke verification for US-001–US-003, and rollback steps.

---

## Metadata

- **Repository**: `KallakrindaVikram/capestone-app`
- **Branch**: `feature/enhancements-sdlc`
- **PR Number**: *N/A (runbook added directly to branch)*
- **Target Environment**: Local Deployment (Dev/Prod-like local)
- **Default Ports**: API **5000**, UI **3000**
- **Deployment Readiness Status**: **READY FOR LOCAL DEPLOYMENT**

---

# 1. Pre-Flight Environment Checks

## 1.1 Required Tools

**Required**

- Node.js (LTS recommended)
- npm (bundled with Node)
- Git
- (Optional) `curl` (Mac/Linux default) or PowerShell `Invoke-WebRequest`

**Verification Criteria**

- Node is installed:
  - Bash:
    ```bash
    node -v
    npm -v
    ```
  - PowerShell:
    ```powershell
    node -v
    npm -v
    ```

- Git is installed:
  - Bash:
    ```bash
    git --version
    ```
  - PowerShell:
    ```powershell
    git --version
    ```

## 1.2 Repository Clone + Checkout Target Branch

**Commands**

- Bash:
  ```bash
  git clone https://github.com/KallakrindaVikram/capestone-app.git
  cd capestone-app
  git checkout feature/enhancements-sdlc
  git pull --ff-only
  ```

- PowerShell:
  ```powershell
  git clone https://github.com/KallakrindaVikram/capestone-app.git
  Set-Location capestone-app
  git checkout feature/enhancements-sdlc
  git pull --ff-only
  ```

**Verification Criteria**

- `git status` shows a clean working tree:
  - Bash:
    ```bash
    git status
    ```
  - PowerShell:
    ```powershell
    git status
    ```

## 1.3 Port Availability Checks (5000 & 3000)

API defaults to port **5000**; UI defaults to port **3000**.

**Bash**

```bash
lsof -i :5000 || true
lsof -i :3000 || true
```

**PowerShell**

```powershell
Get-NetTCPConnection -LocalPort 5000,3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess, State
```

**Verification Criteria (GATE)**

- No process is listening on ports **5000** or **3000**.
- If ports are in use, stop the conflicting process(es) before continuing.

---

# 2. Backend API & SQLite Database Deployment

## 2.1 Install API Dependencies

**Commands**

- Bash:
  ```bash
  cd api
  npm ci
  ```

- PowerShell:
  ```powershell
  Set-Location api
  npm ci
  ```

**Verification Criteria**

- `npm ci` completes without errors.
- `api/node_modules` exists.

## 2.2 Database Seeding (SQLite)

**Commands**

- Bash:
  ```bash
  cd api
  npm run seed
  ```

- PowerShell:
  ```powershell
  Set-Location api
  npm run seed
  ```

**Verification Criteria**

- Seeding completes without errors.
- A SQLite DB file is created/updated (path varies by repo; often under `api/db/` or similar).

## 2.3 Start API Server (Port 5000)

**Commands**

- Bash:
  ```bash
  cd api
  npm start
  ```

- PowerShell:
  ```powershell
  Set-Location api
  npm start
  ```

**Verification Criteria (GATE)**

- Console logs indicate the server is listening (e.g., `Listening on port 5000`).
- `GET http://localhost:5000/api/courses` returns HTTP **200**.

## 2.4 API Health Probe (Verify Headers: `X-Total-Count`, `Location` exposure, CORS)

This gate validates:
- API responds successfully.
- Header `X-Total-Count` is present.
- CORS headers are enabled and `Access-Control-Expose-Headers` includes **`X-Total-Count`** and **`Location`**.

> If your API does not have a dedicated `/health` route, use `/api/courses` as the probe.

### Bash (curl)

```bash
curl -i -s http://localhost:5000/api/courses -o /dev/null | tr -d '\r'
```

### PowerShell (Invoke-WebRequest)

```powershell
$r = Invoke-WebRequest -Uri http://localhost:5000/api/courses -UseBasicParsing
$r.StatusCode
'X-Total-Count: ' + $r.Headers['X-Total-Count']
'Access-Control-Expose-Headers: ' + $r.Headers['Access-Control-Expose-Headers']
'Access-Control-Allow-Origin: ' + $r.Headers['Access-Control-Allow-Origin']
```

**Verification Criteria (GATE)**

- HTTP status is **200**.
- `X-Total-Count` header is present.
- `Access-Control-Expose-Headers` includes `X-Total-Count` and `Location`.
- `Access-Control-Allow-Origin` is present.

### Optional: Verify `Location` header on course create

> Requires valid seeded credentials.

- Bash:
  ```bash
  curl -i -X POST http://localhost:5000/api/courses \
    -H "Content-Type: application/json" \
    -u "joe@smith.com:joepassword" \
    -d '{"title":"Health Check Course","description":"Verify Location header","estimatedTime":"1 hour","materialsNeeded":"None"}'
  ```

- PowerShell:
  ```powershell
  $cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("joe@smith.com:joepassword"))
  $r = Invoke-WebRequest -Uri http://localhost:5000/api/courses -Method POST -UseBasicParsing `
    -Headers @{ Authorization = "Basic $cred" } `
    -ContentType 'application/json' `
    -Body '{"title":"Health Check Course","description":"Verify Location header","estimatedTime":"1 hour","materialsNeeded":"None"}'
  $r.StatusCode
  $r.Headers['Location']
  ```

**Verification Criteria**

- Status is **201** or **204** (depending on implementation).
- `Location` header is present and points to the new resource.

---

# 3. Frontend Client Production Deployment

## 3.1 Install Client Dependencies

**Commands**

- Bash:
  ```bash
  cd client
  npm ci
  ```

- PowerShell:
  ```powershell
  Set-Location client
  npm ci
  ```

**Verification Criteria**

- `npm ci` completes without errors.
- `client/node_modules` exists.

## 3.2 Build Optimized Production Bundle

**Commands**

- Bash:
  ```bash
  cd client
  npm run build
  ```

- PowerShell:
  ```powershell
  Set-Location client
  npm run build
  ```

**Verification Criteria (GATE)**

- Build completes successfully.
- `client/build/` directory exists.

## 3.3 Serve Static Bundle on Port 3000

Preferred approach is serving the production bundle.

### Option A (Recommended): `serve`

- Bash:
  ```bash
  cd client
  npx serve -s build -l 3000
  ```

- PowerShell:
  ```powershell
  Set-Location client
  npx serve -s build -l 3000
  ```

### Option B: Dev server (only if repo requires)

- Bash:
  ```bash
  cd client
  PORT=3000 npm start
  ```

- PowerShell:
  ```powershell
  Set-Location client
  $env:PORT=3000
  npm start
  ```

**Verification Criteria (GATE)**

- UI is reachable at `http://localhost:3000/`.
- No 5xx errors appear in browser console.

---

# 4. Post-Deployment Feature Smoke Matrix

Minimal smoke checks to confirm key user stories function after deployment.

## Test Data Prerequisites

- Seeded users exist (example):
  - `joe@smith.com / joepassword`
  - `sally@jones.com / sallypassword`
- Enough courses exist for pagination testing (ideally **>= 25**).

## US-001: Catalog Search / Sort / Pagination

| Step | Action | Verification Criteria (GATE) |
|---|---|---|
| 1 | Open catalog page | Loads at `http://localhost:3000/` without unhandled errors. |
| 2 | Search by keyword (e.g., `react`) | Results update; at least one result appears **or** explicit empty-state message shown. |
| 3 | Change sort option | Order changes deterministically (e.g., title asc/desc). |
| 4 | Use pagination controls | Next/Prev changes visible list; no API 4xx/5xx in network tab. |
| 5 | Verify API headers | `GET http://localhost:5000/api/courses` returns `200` and includes `X-Total-Count`, and `Access-Control-Expose-Headers` contains `X-Total-Count` and `Location`. |

## US-002: Ownership Enforcement

| Step | Action | Verification Criteria (GATE) |
|---|---|---|
| 1 | Sign in as User A | UI shows signed-in state. |
| 2 | Create a course as User A | API returns `201`/`204` and includes `Location`; UI shows course detail. |
| 3 | Sign out, sign in as User B | Signed-in state updates to User B. |
| 4 | Attempt to edit/delete User A’s course as User B | UI prevents or API returns `403` with `{ "error": "..." }`; course unchanged. |
| 5 | Sign back in as User A | User A can update/delete their own course (returns `204`). |

## US-003: Favorites System

| Step | Action | Verification Criteria (GATE) |
|---|---|---|
| 1 | As unauthenticated user, try to favorite | Redirects to `/signin` (or explicit auth prompt); no persistence. |
| 2 | Sign in, favorite a course | Toggle changes state and remains after refresh. |
| 3 | Open favorites list page (if present) | Favorited course appears; unfavorite removes it. |

> If Favorites functionality is not present in this build, mark US-003 as **NOT IMPLEMENTED** and fail the smoke gate.

---

# 5. Rollback Procedures

## 5.1 Stop Running Services

### Stop API (Port 5000)

- Terminal: `Ctrl+C`

- Kill by port:
  - Bash:
    ```bash
    lsof -ti :5000 | xargs kill -9
    ```
  - PowerShell:
    ```powershell
    $p = (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($p) { Stop-Process -Id $p -Force }
    ```

### Stop UI (Port 3000)

- Terminal: `Ctrl+C`

- Kill by port:
  - Bash:
    ```bash
    lsof -ti :3000 | xargs kill -9
    ```
  - PowerShell:
    ```powershell
    $p = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
    if ($p) { Stop-Process -Id $p -Force }
    ```

**Verification Criteria (GATE)**

- Requests fail to connect:
  - `curl -s http://localhost:5000/api/courses` fails.
  - `curl -s http://localhost:3000/` fails.
- Port checks show no listeners.

## 5.2 Clean Workspace Recovery

### Reset to branch HEAD

- Bash / PowerShell:
  ```bash
  git reset --hard
  git clean -fd
  ```

**Verification Criteria**

- `git status` shows a clean working tree.

### Rebuild from scratch

- API:
  - Bash:
    ```bash
    cd api
    rm -rf node_modules
    npm ci
    npm run seed
    npm start
    ```
  - PowerShell:
    ```powershell
    Set-Location api
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    npm ci
    npm run seed
    npm start
    ```

- Client:
  - Bash:
    ```bash
    cd ../client
    rm -rf node_modules build
    npm ci
    npm run build
    npx serve -s build -l 3000
    ```
  - PowerShell:
    ```powershell
    Set-Location ..\client
    Remove-Item -Recurse -Force node_modules,build -ErrorAction SilentlyContinue
    npm ci
    npm run build
    npx serve -s build -l 3000
    ```

**Verification Criteria (GATE)**

- API health probe passes (Section 2.4).
- UI loads at `http://localhost:3000/`.
