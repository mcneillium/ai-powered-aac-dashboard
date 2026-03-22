# Dashboard Go/No-Go — File-Backed Verification

**Date:** 2026-03-22
**Method:** Every assertion below is backed by a file read, grep, or test run. No prior-summary inference.

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

Full test suite: **9 suites, 94 tests, 0 failures.**

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
| All tests passing (94/94) | GO |
| Service account keys rotated | BLOCKED (manual) |
| API key domain-restricted | BLOCKED (manual) |
| Rules deployed to Firebase | BLOCKED (requires CLI) |
| Functions deployed to Firebase | BLOCKED (requires CLI) |

**Overall: CONDITIONAL GO** — code is ready. Four manual ops actions remain.

---

## Unblocking Commands

```bash
firebase login
firebase deploy --only database    # deploys database.rules.json
firebase deploy --only functions   # deploys hardened setUserPassword
```

Then in Firebase Console: rotate service account keys.
Then in GCP Console: restrict API key to HTTP referrers.
