# Dashboard Ops Runbook — Deployment & Security Closure

**Project:** commai-b98fe
**Region:** europe-west1
**Date:** 2026-03-22
**Deploy script:** `scripts/deploy-dashboard.ps1` (PowerShell, canonical)

---

## Automated Deploy (Recommended)

The deploy script handles tests, dependency install, lint, and Firebase deploy in one shot:

```powershell
# Full deploy (tests + rules + functions)
.\scripts\deploy-dashboard.ps1

# Dry run (validates everything, prints commands, does not deploy)
.\scripts\deploy-dashboard.ps1 -DryRun

# Skip tests (use only if tests were just verified separately)
.\scripts\deploy-dashboard.ps1 -SkipTests
```

The script will:
1. Check Node version (requires 22+, warns on 23+)
2. Verify `firebase.json` has both `database` and `functions` config
3. Verify Firebase CLI auth and project selection
4. Run all tests non-interactively (`CI=true`, `--watchAll=false`)
5. Install `functions/node_modules` (not checked in)
6. Lint Cloud Functions
7. Deploy database rules
8. Deploy Cloud Functions

If any step fails, the script stops immediately with a clear error.

---

## Prerequisites

```powershell
# 1. Node 22 required (functions target Node 22)
node -v
# Must show v22.x.x — if not: nvm install 22; nvm use 22
# .nvmrc in repo root pins to 22

# 2. Firebase CLI (v13+)
npm install -g firebase-tools

# 3. Authenticate
firebase login

# 4. Select project
firebase use commai-b98fe
```

---

## Phase 1: Rotate Compromised Service Account Keys

**Why:** Two service account keys were committed to git history (key IDs `1136dd44...` and `f0aff750...`). The files have been deleted from the working tree and git-ignored, but the keys remain valid until manually revoked in GCP.

### Steps

1. Open **Google Cloud Console** → IAM & Admin → Service Accounts
2. Select: `firebase-adminsdk-fbsvc@commai-b98fe.iam.gserviceaccount.com`
3. Go to the **Keys** tab
4. **Delete** key `1136dd44...`
5. **Delete** key `f0aff750...`
6. Click **Add Key → Create new key → JSON**
7. Download the new key — store it in a secure vault (1Password, GCP Secret Manager, etc.)
8. **Do NOT** place the new key in this repository

### Verification

```powershell
# Old keys must fail (if retained for testing):
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\OLD-key.json"
firebase deploy --only database --project commai-b98fe --dry-run
# Expected: UNAUTHENTICATED or Invalid JWT Signature

# New key works:
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\NEW-key.json"
firebase deploy --only database --project commai-b98fe --dry-run
# Expected: success without auth errors
```

---

## Phase 2: Restrict Firebase API Key

**Why:** The client API key (`AIzaSyBZS_...`) is currently unrestricted. Restricting prevents abuse from unauthorized origins.

### Steps

1. Open **Google Cloud Console** → APIs & Services → Credentials
2. Find the **Browser key** matching `AIzaSyBZS_...`
3. Under **Application restrictions**, select **HTTP referrers** and add:
   ```
   https://commai-b98fe.web.app/*
   https://commai-b98fe.firebaseapp.com/*
   http://localhost:3000/*
   ```
4. Under **API restrictions**, select **Restrict key** and enable only:
   - Firebase Realtime Database API
   - Identity Toolkit API
   - Token Service API

### Verification

- Open `https://commai-b98fe.web.app` — login should work normally
- From a different domain, try using the key — should return `API key not valid for this domain`

---

## Phase 3: Deploy Database Rules

**What gets deployed:** `database.rules.json` (96 lines — 5 data nodes, default-deny catch-all, claims-only auth, field validation).

**Linked via:** `firebase.json` → `"database": { "rules": "database.rules.json" }`

### Manual command (if not using deploy script)

```powershell
firebase deploy --only database --project commai-b98fe
```

### Verification

Firebase Console → Realtime Database → Rules tab:
- Confirm `$other` node has `.read: false, .write: false`
- Confirm `users.$uid` write requires `auth.token.role === 'admin'`
- Confirm `fineTuneMetrics` write requires `auth.token.role === 'admin'`

Or via PowerShell:
```powershell
# Unauthenticated read — must be denied
Invoke-RestMethod "https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app/users.json"
# Expected: error "Permission denied"
```

---

## Phase 4: Deploy Cloud Functions

**What gets deployed:** `setUserPassword` — a v2 HTTPS function in `europe-west1`.

**Dependencies:** `firebase-admin@^12.6.0`, `firebase-functions@^6.0.1`

**Runtime:** Node 22 (per `functions/package.json` → `"engines": { "node": "22" }`)

**Server-side config:** None. Verified by inspecting `functions/index.js`:
- No `functions.config()` calls (legacy pattern — not used)
- No `defineSecret()` or `defineString()` calls (modern pattern — not needed)
- No `process.env` references
- `admin.initializeApp()` uses default GCP service credentials (auto-provisioned)
- CORS origins hardcoded: `localhost:3000`, `commai-b98fe.web.app`, `commai-b98fe.firebaseapp.com`

**No Firebase environment config or secrets need to be set.**

### Manual commands (if not using deploy script)

```powershell
# Install dependencies (not checked into git)
Push-Location functions; npm install; Pop-Location

# Lint
Push-Location functions; npm run lint; Pop-Location

# Deploy
firebase deploy --only functions --project commai-b98fe
```

### Verification

```powershell
# POST without auth — should return 401
Invoke-RestMethod -Method POST -Uri "https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword" `
  -ContentType "application/json" -Body '{"uid":"test","newPassword":"Test1234"}'
# Expected: 401 Unauthorized

# GET — should return 405
Invoke-RestMethod "https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword"
# Expected: 405 Method Not Allowed
```

---

## Phase 5: Post-Deploy Smoke Tests

Run after all four phases above are complete.

### 5.1 Database Rules — Live

| Test | Expected |
|------|----------|
| Unauthenticated read `/users.json` | `{"error":"Permission denied"}` |
| Write to unknown path | `{"error":"Permission denied"}` |
| Authenticated read with valid token | JSON data returned |

### 5.2 Authentication Flow

| Test | Expected |
|------|----------|
| Admin login at `commai-b98fe.web.app` | Admin dashboard, user management nav |
| Caregiver login | Caregiver dashboard, no admin nav |
| Invalid password | Error message, no redirect |

### 5.3 Role-Based Access

| Test | Expected |
|------|----------|
| Admin → `/user-management` | Page loads |
| Caregiver → `/user-management` | Redirected |
| Admin → Set Password (other user) | 200 OK |
| Admin → Set Own Password | 400 rejected |

### 5.4 CORS

| Test | Expected |
|------|----------|
| Request from `commai-b98fe.web.app` | `Access-Control-Allow-Origin` header present |
| Request from unauthorized origin | No CORS header |

---

## Phase 6: Optional — Clean Git History

**When:** After key rotation and all deploys confirmed.

```powershell
# Using BFG Repo-Cleaner (requires Java)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

java -jar bfg.jar --delete-files serviceAccountKey.json
java -jar bfg.jar --delete-folders credentials

git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Coordinate with team before force-pushing
git push --force --all
git push --force --tags
```

**Warning:** Rewrites history. All team members must re-clone.

---

## Completion Checklist

| Step | Status |
|------|--------|
| [ ] Phase 1: Service account keys rotated | |
| [ ] Phase 2: API key restricted | |
| [ ] Phase 3: Database rules deployed | |
| [ ] Phase 4: Cloud Functions deployed | |
| [ ] Phase 5.1: Rules live verification | |
| [ ] Phase 5.2: Auth flow smoke test | |
| [ ] Phase 5.3: Role-based access | |
| [ ] Phase 5.4: CORS | |
| [ ] Phase 6: Git history cleaned (optional) | |

---

## Node Version Compatibility

| Component | Required | Notes |
|-----------|----------|-------|
| Dashboard (React/CRA) | Node 18+ | Runs on 22 and 24 |
| Cloud Functions | **Node 22** | `functions/package.json` → `"engines": { "node": "22" }` |
| Firebase CLI deploy | Node 22 recommended | Deploy uploads to GCP Node 22 runtime |
| `.nvmrc` | `22` | Pin for all contributors |

If your local Node is v24, Firebase CLI will deploy to the GCP Node 22 runtime regardless — the `engines` field controls the cloud runtime, not local execution. However, `npm install` in `functions/` may produce a different lockfile on Node 24 vs 22. For consistency, use Node 22 locally.
