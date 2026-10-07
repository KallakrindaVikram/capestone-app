# Local Deployment Runbook (Local Prod-like Run)

## Metadata

- **Repository**: [https://github.com/KallakrindaVikram/capestone-app](https://github.com/KallakrindaVikram/capestone-app)
- **Branch**: `feature/enhancements-sdlc`
- **Pull Request**: #7 — [Enhancements: Catalog Search, Pagination, and Error Standardization](https://github.com/KallakrindaVikram/capestone-app/pull/7)
- **Target environment**: Local deployment (API port 5000, UI port 3000)
- **Deployment readiness status**: READY_FOR_LOCAL_DEPLOYMENT

---

> This runbook describes a production-ready, local-only deployment flow for the Node/Express API (SQLite backed) and React client.

## Section 1 — Pre-Flight Environment Checks

**Goal**: Ensure runtime prerequisites are present and ports are free before starting backend and frontend.

### 1.1 Prerequisites

- Node.js (LTS) installed (recommended: 18+)
- npm 9+ (shipped with Node)
- Git
- Optional for prod-like UI serving: `serve` (installed globally, or via `npx` below)

**Verification criteria**: commands below return versions without errors.

**Bash**

```bash
node -v
npm -v
git -v
```

**PowerShell**

```powershell
node -v
npm -v
git -v
```

### 1.2 Confirm ports 5000 & 3000 are available

**Verification criteria**: commands show no listener on the ports. If a process is listening, stop it or select different ports.

**Bash**

```bash
# Linux/Mac
lsof -iTCP:5000 || echo "PORT 5000 free"
lsof -iTCP:3000 || echo "PORT 3000 free"
```

**PowerShell**

```powershell
# Windows
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object State, LocalAddress, LocalPort, OwningProcess
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object State, LocalAddress, LocalPort, OwningProcess
```

### 1.3 Clone & check out the target branch

**Verification criteria**: `git status` shows branch `feature/enhancements-sdlc` and working tree is clean.

```bash
git clone https://github.com/KallakrindaVikram/capestone-app.git
cd capestone-app
git fetch
git checkout feature/enhancements-sdlc
git status
```

---

## Section 2 — Backend API & SQLite Database Deployment

**Goal**: Install dependencies, seed SQLite database, start the API on port **5000**, and verify health including required headers.

### 2.1 Install API dependencies

**Verification criteria**: `npm ci` or `npm install` completes with exit code 0.

**Bash**

```bash
cd api
npm ci || npm install
```

**PowerShell**

```powershell
cd api
npm ci; if ($LASTEXITCODE -ne 0) { npm install }
```

### 2.2 Seed the SQLite database

The API project provides a seeding script.

**Verification criteria**:
- command exits successfully
- logs indicate tables/data were created/inserted
- the SQLite file exists under the API folder (commonly `./db.sqlite` or `./database.sqlite`; exact name may vary)

**Bash**

```bash
npm run seed
ls -la . | grep -E "sqlite|db\." || true
```

**PowerShell**

```powershell
npm run seed
Get-ChildItem . | Where-Object { $_.Name -match 'sqlite|db\.' }
```

### 2.3 Start the API server (port 5000)

The script uses `nodemon`.

**Verification criteria**:
- process remains running
- API responds on `http://localhost:5000/`

**Bash**

```bash
npm start
```

**PowerShell**

```powershell
npm start
```

> Keep this terminal running.

### 2.4 API health probe + header verification (`X-Total-Count`, `Location`, CORS)

Perform a GET on a list endpoint to validate pagination headers and CORS exposure.

#### 2.4.1 Choose a list endpoint

Use the first endpoint that exists in your API (common examples include):
- `GET /api/courses`
- `GET /api/products`
- `GET /api/items`

**Verification criteria**: HTTP 200 and response headers include:
- `X-Total-Count` (present and an integer)
- `Access-Control-Expose-Headers` includes `X-Total-Count` and `Location`
- For POST creation endpoints, responses include `Location` header (validated below)

#### 2.4.2 GET probe (validate `X-Total-Count` and CORS exposure)

**Bash (curl)**

```bash
# Replace /api/courses with your list endpoint
curl -i "http://localhost:5000/api/courses?page=1&limit=10" | sed -n '1,40p'
```

**PowerShell (Invoke-WebRequest)**

```powershell
# Replace /api/courses with your list endpoint
$r = Invoke-WebRequest -Uri "http://localhost:5000/api/courses?page=1&limit=10" -Method GET
$r.StatusCode
$r.Headers['X-Total-Count']
$r.Headers['Access-Control-Expose-Headers']
```

#### 2.4.3 POST probe (validate `Location` and CORS exposure)

If the API supports creating a resource (e.g., `POST /api/courses`), run a create request and validate `Location`.

**Verification criteria**:
- HTTP 201
- `Location` header exists and points to the created resource
- `Access-Control-Expose-Headers` includes `Location`

**Bash (curl)**

```bash
# Example payload; adjust endpoint and fields to match your API schema
curl -i -X POST "http://localhost:5000/api/courses" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Item","description":"created by deployment runbook"}' | sed -n '1,60p'
```

**PowerShell (Invoke-WebRequest + headers)**

```powershell
# Example payload; adjust endpoint and fields to match your API schema
$body = @{ title = 'Smoke Test Item'; description = 'created by deployment runbook' } | ConvertTo-Json
$r = Invoke-WebRequest -Uri "http://localhost:5000/api/courses" -Method POST -ContentType "application/json" -Body $body
$r.StatusCode
$r.Headers['Location']
$r.Headers['Access-Control-Expose-Headers']
```

---

## Section 3 — Frontend Client Production Deployment

**Goal**: Build an optimized production bundle and serve it locally on port **3000**.

### 3.1 Install client dependencies

**Verification criteria**: `npm ci` or `npm install` completes with exit code 0.

**Bash**

```bash
cd ../client
npm ci || npm install
```

**PowerShell**

```powershell
cd ../client
npm ci; if ($LASTEXITCODE -ne 0) { npm install }
```

### 3.2 Build optimized frontend bundle

**Verification criteria**:
- `npm run build` completes successfully
- `./build` directory exists and contains `index.html`

**Bash**

```bash
npm run build
test -f build/index.html && echo "UI build OK" || (echo "UI build missing build/index.html" && exit 1)
```

**PowerShell**

```powershell
npm run build
if (Test-Path "build/index.html") { "UI build OK" } else { throw "UI build missing build/index.html" }
```

### 3.3 Serve production build on port 3000

Use `serve` to host the static build.

**Verification criteria**:
- server starts without error
- `http://localhost:3000` returns HTTP 200

**Bash**

```bash
npx --yes serve -s build -l 3000
```

**PowerShell**

```powershell
npx --yes serve -s build -l 3000
```

**UI reachability check**

**Bash**

```bash
curl -I http://localhost:3000 | head -n 5
```

**PowerShell**

```powershell
(Invoke-WebRequest -Uri "http://localhost:3000" -Method GET).StatusCode
```

---

## Section 4 — Post-Deployment Feature Smoke Matrix

**Goal**: Validate the critical user stories after deployment.

> Execute with API running on `:5000` and UI served on `:3000`.

### Test accounts / data

**Verification criteria**:
- at least 2 users exist after seeding
- at least 1 catalog item exists

If the seed does not create users/items, create them using the API, then re-run the matrix.

### Smoke Matrix

| Story | Area | Steps | Expected Result / Verification Gate |
|---|---|---|---|
| **US-001** | Catalog: Search | 1) Open UI `http://localhost:3000` 2) Use search input to query a known substring 3) Observe results | Results list updates; only matching items shown; no console errors; API responses are 200 |
| **US-001** | Catalog: Sort | 1) Select sort (e.g., title asc/desc, date) 2) Verify list order changes | Sorting changes order deterministically; API request contains sort params (confirm via DevTools Network) |
| **US-001** | Catalog: Pagination | 1) Navigate to page 2 2) Navigate back to page 1 | Page changes without error; API includes `X-Total-Count` header; UI shows correct total/pages |
| **US-002** | Ownership enforcement (API) | 1) Authenticate as User A 2) Attempt to edit/delete a resource owned by User B | API returns 403 (or 401 if unauthenticated); UI shows authorization error; no data changed |
| **US-002** | Ownership enforcement (UI) | 1) Login as non-owner 2) Open detail page for another user's resource | Edit/Delete controls hidden or disabled; direct API attempt still denied |
| **US-003** | Favorites: Add | 1) Login 2) Open a catalog item 3) Click “Favorite” | Favorite indicator toggles; API returns success; favorite persists after refresh |
| **US-003** | Favorites: Remove | 1) Unfavorite the same item | Favorite removed; UI updates immediately; persists after refresh |
| **US-003** | Favorites: Listing | 1) Open Favorites view/page | Only favorited items shown; count matches expected |

**Global verification criteria** (must pass):
- UI loads on `:3000` and API responds on `:5000`
- No unhandled exceptions in API logs
- No red errors in browser console during smoke

---

## Section 5 — Rollback Procedures (Local)

**Goal**: Stop services and return workspace to a clean pre-deploy state.

### 5.1 Stop running processes

**Verification criteria**: ports 5000 and 3000 are no longer listening.

- In the terminals running API/UI, press `Ctrl+C`.

**Bash (optional hard stop)**

```bash
# Kill process listening on port 5000 / 3000 (Linux/Mac)
kill -9 $(lsof -t -iTCP:5000 -sTCP:LISTEN) 2>/dev/null || true
kill -9 $(lsof -t -iTCP:3000 -sTCP:LISTEN) 2>/dev/null || true
```

**PowerShell (optional hard stop)**

```powershell
# Identify owning process and stop it (Windows)
$pid5000 = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($pid5000) { Stop-Process -Id $pid5000 -Force }
$pid3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($pid3000) { Stop-Process -Id $pid3000 -Force }
```

### 5.2 Remove local artifacts (optional)

Use this when you need a clean slate.

**Verification criteria**:
- `node_modules` removed (if chosen)
- generated `build/` removed
- local SQLite DB removed (only if you intend to reseed)

**Bash**

```bash
# From repo root
rm -rf api/node_modules client/node_modules client/build
rm -f api/*.sqlite api/*.db api/db.sqlite api/database.sqlite 2>/dev/null || true
```

**PowerShell**

```powershell
# From repo root
Remove-Item -Recurse -Force api\node_modules, client\node_modules, client\build -ErrorAction SilentlyContinue
Remove-Item -Force api\*.sqlite, api\*.db, api\db.sqlite, api\database.sqlite -ErrorAction SilentlyContinue
```

### 5.3 Restore code to last committed state

**Verification criteria**: `git status` shows clean working tree.

**Bash / PowerShell**

```bash
git reset --hard
git clean -fd
git status
```
