# Post-Rotation Verification Checklist

**Project:** CommAI Dashboard
**Created:** 2026-03-21
**Last Updated:** 2026-03-22
**Status:** BLOCKED ON MANUAL CONSOLE ACTION — see steps below
**Ops Runbook:** `docs/release/dashboard-ops-runbook.md`

---

## Compromised Credentials Identified

### 1. Service Account Key (Primary)
- **Service account:** `firebase-adminsdk-fbsvc@<PROJECT_ID>.iam.gserviceaccount.com`
- **Private Key ID (truncated):** `1136dd44...`
- **Originally in:** `credentials/serviceAccountKey.json`
- **Git history:** First committed `d1e2aaf` (2025-03-01), removed `7f9e813` (2026-03-21)
- **Exposure window:** ~12 months
- **Files on disk:** DELETED (2026-03-21)
- **Git tracking:** Removed via `git rm --cached` and `.gitignore`
- **Rotation status:** [ ] PENDING — requires manual action in Firebase Console

### 2. Service Account Key (Admin Settings)
- **Service account:** Same as above
- **Private Key ID (truncated):** `f0aff750...`
- **Originally in:** `credentials/AdminSetting/serviceAccountKey.json`
- **Git history:** First committed `8f9aa1e` (2025-07-08), removed `7f9e813` (2026-03-21)
- **Exposure window:** ~8 months
- **Files on disk:** DELETED (2026-03-21)
- **Git tracking:** Removed via `git rm --cached` and `.gitignore`
- **Rotation status:** [ ] PENDING — requires manual action in Firebase Console

### 3. Firebase Client API Key
- **Key pattern:** `AIzaSyBZS_...` (not printed in full — treat as semi-public)
- **Current location:** `.env.local` only (git-ignored)
- **Source code:** NOT hardcoded — `firebaseConfig.js` reads from `process.env`
- **Note:** Firebase client API keys are designed to be exposed in client apps. Security comes from domain restrictions + Firebase security rules, not key secrecy.
- **Restriction status:** [ ] PENDING — apply HTTP referrer restrictions in GCP Console

---

## Code-Level Closure Status

| Action | Status | Date |
|--------|--------|------|
| API key removed from source code | DONE | 2026-03-21 |
| Service account files removed from git tracking | DONE | 2026-03-21 |
| Service account files deleted from disk | DONE | 2026-03-21 |
| `.gitignore` blocks credentials patterns | DONE | 2026-03-21 |
| `firebaseConfig.js` uses env vars only | DONE | 2026-03-21 |
| Cloud Functions use default GCP auth (no key file) | DONE | 2026-03-21 |
| AuthContext uses custom claims only (no DB fallback) | DONE | 2026-03-21 |
| Database security rules created and configured | DONE | 2026-03-21 |
| Full API key redacted from all documentation | DONE | 2026-03-21 |
| Private key IDs truncated in documentation | DONE | 2026-03-21 |

---

## Required Manual Actions (Firebase Console)

### Step 1: Rotate Service Account Keys

1. Open Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** to create a replacement
3. Store the new key securely OUTSIDE the repository
4. Open Google Cloud Console → IAM → Service Accounts
5. Find the `firebase-adminsdk-fbsvc` service account
6. Under the **Keys** tab, **delete** both compromised keys:
   - Key ID starting `1136dd44...`
   - Key ID starting `f0aff750...`
7. Confirm deletion — old keys must return auth errors

### Step 2: Restrict Client API Key

1. Open Google Cloud Console → APIs & Services → Credentials
2. Find the browser key matching `AIzaSyBZS_...`
3. Set **Application restrictions** to HTTP referrers:
   - `https://<PROJECT_ID>.web.app/*`
   - `https://<PROJECT_ID>.firebaseapp.com/*`
   - `http://localhost:3000/*`
4. Set **API restrictions** to:
   - Firebase Realtime Database API
   - Firebase Auth API
   - Identity Toolkit API
   - Token Service API

### Step 3: Clean Git History (Recommended)

```bash
# Using BFG Repo-Cleaner:
bfg --delete-files serviceAccountKey.json
bfg --delete-folders credentials
git reflog expire --expire=now --all
git gc --prune=now --aggressive
# Coordinate with team before force-pushing
git push --force --all
```

### Step 4: Audit Access Logs

1. Open Google Cloud Console → Logging → Logs Explorer
2. Filter by the compromised service account email
3. Review the full exposure window (2025-03-01 to present)
4. Look for: unexpected user creations, data reads, config changes

---

## Post-Rotation Verification Checklist

After completing the manual steps above:

- [ ] Old key `1136dd44...` returns authentication error
- [ ] Old key `f0aff750...` returns authentication error
- [ ] New service account key works for `firebase deploy --only functions`
- [ ] New service account key works for `firebase deploy --only database`
- [ ] Client API key restrictions applied in GCP Console
- [ ] Dashboard login still works (admin and caregiver)
- [ ] Cloud Function `setUserPassword` still works end-to-end
- [ ] No `credentials/` directory on disk: `ls credentials/` fails
- [ ] No service account files anywhere: `find . -name 'serviceAccountKey*'` returns nothing
- [ ] `.gitignore` blocks `credentials/`, `serviceAccountKey*.json`, `.env.local`
- [ ] `git status` shows no untracked credential files

---

## Post-Deploy Verification (after rotation + deploy)

After completing key rotation AND deploying rules + functions, verify the full stack:

### Database rules active

```bash
# Unauthenticated read — must return Permission denied
curl -s "https://commai-b98fe-default-rtdb.europe-west1.firebasedatabase.app/users.json"
```

### Cloud Function responding

```bash
# Should return 401 (auth required) — proves function is live
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"uid":"x","newPassword":"Test1234"}' \
  https://europe-west1-commai-b98fe.cloudfunctions.net/setUserPassword
```

### Dashboard end-to-end

- [ ] Admin login at `https://commai-b98fe.web.app` → admin dashboard loads
- [ ] Caregiver login → caregiver dashboard loads, no admin nav items
- [ ] Admin sets password for another user → 200 OK
- [ ] Admin attempts to set own password → 400 rejected
- [ ] Caregiver navigates to `/user-management` → redirected

### Functions runtime

- [ ] `firebase functions:log --project commai-b98fe` shows no crash loops
- [ ] Response times under 5s for `setUserPassword`

---

## Ongoing Requirements

- Google Cloud audit logging enabled for the project
- IAM audit log review monthly
- No service account keys created without documented approval
- All new developers receive copy of `docs/security/secret-handling.md`
