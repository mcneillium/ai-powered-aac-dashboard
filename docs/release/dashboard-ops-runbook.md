# Dashboard Ops Runbook — Deployment & Security Closure

**Project:** commai-b98fe
**Region:** europe-west1
**Date:** 2026-03-22

---

## Prerequisites

```bash
# 1. Firebase CLI installed (v13+)
npm install -g firebase-tools

# 2. Authenticated with a project-owner account
firebase login

# 3. Verify correct project is selected
firebase use commai-b98fe
# Expected: "Now using project commai-b98fe"

# 4. Install Cloud Functions dependencies (required — not checked in)
cd functions && npm install && cd ..
```

---

## Phase 1: Rotate Compromised Service Account Keys

**Why:** Two service account keys were committed to git history (key IDs `1136dd44...` and `f0aff750...`). The files have been deleted from the working tree and git-ignored, but the keys remain valid until manually revoked in GCP.

### Steps

1. Open **Google Cloud Console** → IAM & Admin → Service Accounts
2. Select service account: `firebase-adminsdk-fbsvc@commai-b98fe.iam.gserviceaccount.com`
3. Go to the **Keys** tab
4. **Delete** key `1136dd44...`
5. **Delete** key `f0aff750...`
6. Click **Add Key → Create new key → JSON**
7. Download the new key — store it in a secure vault (1Password, GCP Secret Manager, etc.)
8. **Do NOT** place the new key in this repository

### Verification

```bash
# Old keys must fail:
# Use the old key file (if retained for testing) with any gcloud command —
# expect "UNAUTHENTICATED" or "Invalid JWT Signature"

# New key works:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/new-key.json
firebase deploy --only database --project commai-b98fe --dry-run
# Should print "would deploy database rules" without auth errors
```

---

## Phase 2: Restrict Firebase API Key

**Why:** The client API key (`AIzaSyBZS_...`) is currently unrestricted. While Firebase client keys are semi-public by design, restricting them prevents abuse from unauthorized origins.

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
- Open a different domain and try using the key — should return `API key not valid for this domain`

---

## Phase 3: Deploy Database Rules

**What gets deployed:** `database.rules.json` (96 lines — 5 data nodes, default-deny catch-all, claims-only auth, field validation).

**Linked via:** `firebase.json` → `"database": { "rules": "database.rules.json" }`

### Command

```bash
firebase deploy --only database --project commai-b98fe
```

Expected output:
```
✔  database: rules ready to deploy.
✔  Deploy complete!
```

### Verification

```bash
# 1. Fetch live rules via REST API
curl -s "https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app/.settings/rules.json?auth=ACCESS_TOKEN" | python3 -m json.tool

# Compare with local file — should be identical
```

Or in Firebase Console → Realtime Database → Rules tab:
- Confirm `$other` node has `.read: false, .write: false`
- Confirm `users.$uid` write requires `auth.token.role === 'admin'`
- Confirm `fineTuneMetrics` write requires `auth.token.role === 'admin'`

---

## Phase 4: Deploy Cloud Functions

**What gets deployed:** `setUserPassword` — a v2 HTTPS function in `europe-west1`.

**Dependencies:** `firebase-admin@^12.6.0`, `firebase-functions@^6.0.1`

**Runtime:** Node 22 (per `functions/package.json` → `"engines": { "node": "22" }`)

**Server-side config:** None. The function uses `admin.initializeApp()` with default credentials (auto-provisioned by GCP). No `functions.config()`, no `defineSecret()`, no `process.env` references.

### Pre-deploy

```bash
# Install dependencies (not checked into git)
cd functions && npm install && cd ..

# Run lint (same as predeploy hook in firebase.json)
cd functions && npm run lint && cd ..
```

### Command

```bash
firebase deploy --only functions --project commai-b98fe
```

Expected output:
```
✔  functions: Finished running predeploy script.
i  functions: preparing functions directory for uploading...
✔  functions[setUserPassword(europe-west1)] Successful create operation.
✔  Deploy complete!

Function URL (setUserPassword(europe-west1)):
  https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword
```

### Verification

```bash
# 1. OPTIONS preflight (should return 204)
curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://commai-b98fe.web.app" \
  -H "Access-Control-Request-Method: POST" \
  https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword
# Expected: 204

# 2. POST without auth (should return 401)
curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"uid":"test","newPassword":"Test1234"}' \
  https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword
# Expected: 401 {"error":"Unauthorized: valid auth token required"}

# 3. GET (should return 405)
curl -s -w "\n%{http_code}" \
  https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword
# Expected: 405 {"error":"Method Not Allowed"}
```

---

## Phase 5: Post-Deploy Smoke Tests

Run these in order after all four phases above are complete.

### 5.1 Database Rules — Live Verification

| Test | Command/Action | Expected |
|------|---------------|----------|
| Unauthenticated read | `curl https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app/users.json` | `{"error":"Permission denied"}` |
| Unauthenticated write | `curl -X PUT -d '{"x":1}' .../unknown.json` | `{"error":"Permission denied"}` |
| Default deny | `curl .../doesNotExist.json?auth=VALID_TOKEN` | `{"error":"Permission denied"}` |

### 5.2 Authentication Flow

| Test | Action | Expected |
|------|--------|----------|
| Admin login | Login at `https://commai-b98fe.web.app` with admin account | Sees admin dashboard, user management, caregivers nav |
| Caregiver login | Login with caregiver account | Sees caregiver dashboard, no user management nav |
| Invalid login | Wrong password | Error message, no redirect |

### 5.3 Role-Based Access

| Test | Action | Expected |
|------|--------|----------|
| Admin → User Management | Navigate to `/user-management` | Page loads, user list visible |
| Caregiver → User Management | Navigate to `/user-management` directly | Redirected away |
| Admin → Set Password | Use SetPasswordForm for a non-self user | 200 response |
| Admin → Set Own Password | Attempt via API | 400 "Cannot set your own password" |

### 5.4 Cloud Function CORS

| Test | Expected |
|------|----------|
| Request from `commai-b98fe.web.app` | `Access-Control-Allow-Origin` header present |
| Request from unauthorized origin | No CORS header in response |

---

## Phase 6: Optional — Clean Git History

**When:** After key rotation is confirmed and all deploys succeed.

```bash
# Install BFG Repo-Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Remove service account files from all history
bfg --delete-files serviceAccountKey.json
bfg --delete-folders credentials

# Clean up refs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Coordinate with all team members before force-pushing
git push --force --all
git push --force --tags
```

**Warning:** This rewrites history. All team members must re-clone after force push.

---

## Completion Checklist

| Step | Status |
|------|--------|
| [ ] Phase 1: Service account keys rotated | |
| [ ] Phase 2: API key restricted | |
| [ ] Phase 3: Database rules deployed | |
| [ ] Phase 4: Cloud Functions deployed | |
| [ ] Phase 5.1: Rules live verification passed | |
| [ ] Phase 5.2: Auth flow smoke test passed | |
| [ ] Phase 5.3: Role-based access verified | |
| [ ] Phase 5.4: CORS verified | |
| [ ] Phase 6: Git history cleaned (optional) | |
