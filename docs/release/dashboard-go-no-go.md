# Dashboard Go/No-Go — File-Backed Verification

**Date:** 2026-03-22 (updated)
**Method:** Every assertion backed by file reads, greps, or test runs.
**Deploy script:** `scripts/deploy-dashboard.ps1` (PowerShell)

---

## Verification Results

### 1. Does `database.rules.json` exist?

**YES.**
- Path: `/database.rules.json`
- Size: 96 lines, 2656 bytes
- Content: 5 data nodes + default-deny `$other`
- All write rules use `auth.token.role` (custom claims only)
- No `root.child()` in any rule
- Verified by: `databaseRules.test.js` (17 tests) + `firebaseRulesEmulator.test.js` (39 tests) — all pass

### 2. Do `firebase.json` and project config exist?

**YES.**
- `firebase.json`: configures `database.rules` → `database.rules.json` and `functions` → `functions/`
- `.firebaserc`: sets default project to `commai-b98fe`

### 3. Do Firebase rules tests exist and pass?

**YES.** 56 rules-specific tests across 2 suites, all passing:
- `databaseRules.test.js`: 17 structural tests (invariants, claims-only, default-deny)
- `firebaseRulesEmulator.test.js`: 39 role-based pass/fail matrix tests (unauth, authed, caregiver, admin, validation)

Full test suite: **10 suites, 95 tests, 0 failures** (includes `src/App.test.js` smoke test).

### 4. Has the schema-fix patch been applied?

**NO PATCH EXISTS.** `find . -name '*.patch'` returns nothing. No `.diff` files. No `schema-fix` references in any file. There is nothing to apply.

### 5. Does `src/shared/schema.js` exist and match documented contracts?

**YES — CREATED THIS SESSION.**
- Path: `src/shared/schema.js` (exports `DB_PATHS`, `ROLES`, field schemas, access control summary, Cloud Function contract)
- Alignment verified by: `schemaContractAlignment.test.js` (10 tests) which checks every DB_PATH maps to a rules node, every rules field appears in the schema, max lengths match, role enums match
- Contracts also documented in `docs/architecture/shared-contracts.md` and `docs/dashboard/dashboard-release-readiness.md`

### 6. Are any secrets still hardcoded?

**NO.**
- `grep -rn 'AIzaSy' src/ functions/ --include='*.js' --include='*.json'` → zero matches
- `grep -rn 'private_key|BEGIN PRIVATE KEY|hf_|sk-' src/ functions/` → zero matches
- `ls credentials/` → "No such file or directory"
- `firebaseConfig.js` reads all values from `process.env.REACT_APP_*`
- `.env.local` (contains API key) is confirmed git-ignored: `git check-ignore .env.local` → `.env.local`
- `.env.example` contains only placeholder values (`your-api-key`, etc.)

---

## Decision

| Criterion | Status |
|-----------|--------|
| Database rules exist and are valid | GO |
| Firebase project config exists | GO |
| Rules tests exist and pass (56 tests) | GO |
| Schema file exists and matches rules | GO |
| No hardcoded secrets in source | GO |
| All tests passing (95/95, 10 suites) | GO |
| Deploy script tested (`scripts/deploy-dashboard.ps1`) | GO |
| Node version pinned (`.nvmrc` → 22) | GO |
| Service account keys rotated | BLOCKED (manual) |
| API key domain-restricted | BLOCKED (manual) |
| Rules deployed to Firebase | BLOCKED (requires CLI) |
| Functions deployed to Firebase | BLOCKED (requires CLI) |

**Overall: CONDITIONAL GO** — code is ready. Four manual ops actions remain.

**Full runbook:** `docs/release/dashboard-ops-runbook.md`

---

## Ops Blocker Details

### Blocker 1: Rotate Service Account Keys (HIGH — security)

Two compromised keys remain valid in GCP (key IDs `1136dd44...` and `f0aff750...`).
See: `docs/release/dashboard-ops-runbook.md` → Phase 1

### Blocker 2: Restrict Firebase API Key (MEDIUM — hardening)

Client API key `AIzaSyBZS_...` has no HTTP referrer restriction.
See: `docs/release/dashboard-ops-runbook.md` → Phase 2

### Blocker 3: Deploy Database Rules (HIGH — functional)

`database.rules.json` is validated locally (56 tests) but not yet live.
```bash
cd functions && npm install && cd ..
firebase deploy --only database --project commai-b98fe
```
See: `docs/release/dashboard-ops-runbook.md` → Phase 3

### Blocker 4: Deploy Cloud Functions (HIGH — functional)

`setUserPassword` (v2, europe-west1, Node 22) is tested locally but not yet live.
**Note:** `functions/node_modules` is not checked in — run `npm install` in `functions/` before deploy.
```bash
cd functions && npm install && cd ..
firebase deploy --only functions --project commai-b98fe
```
See: `docs/release/dashboard-ops-runbook.md` → Phase 4

### Functions Config Requirements

The Cloud Function uses **zero** external config:
- No `functions.config()` calls
- No `defineSecret()` or `defineString()` calls
- No `process.env` references
- `admin.initializeApp()` uses default GCP service credentials (auto-provisioned)
- CORS origins are hardcoded to: `localhost:3000`, `commai-b98fe.web.app`, `commai-b98fe.firebaseapp.com`

### Node Version

`.nvmrc` pins to Node 22. Functions `package.json` requires `"node": "22"`.
If local machine runs Node 24, deploy still targets GCP Node 22 runtime, but run `nvm use 22` for lockfile consistency.

### Deploy order

```powershell
# One-command deploy (recommended):
.\scripts\deploy-dashboard.ps1

# Or step by step:
```

1. Rotate keys first (Phase 1) — otherwise deploy may use a compromised credential
2. Deploy rules (Phase 3) — no dependency on functions
3. Deploy functions (Phase 4) — no dependency on rules
4. Restrict API key (Phase 2) — do last so it doesn't break testing during deploy
5. Smoke test (Phase 5)

---

## Post-Deploy Verification

After all four blockers are resolved, run the smoke tests in `docs/release/dashboard-ops-runbook.md` → Phase 5 and check off:

- [ ] Unauthenticated database reads return `Permission denied`
- [ ] Default-deny blocks unknown paths
- [ ] Admin login shows admin nav
- [ ] Caregiver login shows caregiver nav, no admin routes
- [ ] `setUserPassword` returns 401 without auth, 200 with valid admin token
- [ ] CORS blocks unauthorized origins
- [ ] `firebase functions:log` shows no crash loops
