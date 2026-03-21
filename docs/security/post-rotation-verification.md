# Post-Rotation Verification Checklist

**Project:** CommAI Dashboard (commai-b98fe)
**Date:** 2026-03-21
**Status:** ACTION REQUIRED - Keys must be rotated manually in Firebase Console

---

## Compromised Credentials Identified

### 1. Service Account Key (Primary)
- **Email:** `firebase-adminsdk-fbsvc@commai-b98fe.iam.gserviceaccount.com`
- **Private Key ID:** `1136dd44b0ed66a2554796eaea541bcc6ecd6e28`
- **Exposed in:** `credentials/serviceAccountKey.json`
- **Git commits:** First committed in `d1e2aaf` (2025-03-01), removed in `7f9e813` (2026-03-21)
- **Exposure duration:** ~12 months in git history
- **Status:** [ ] PENDING ROTATION

### 2. Service Account Key (Admin Settings)
- **Email:** `firebase-adminsdk-fbsvc@commai-b98fe.iam.gserviceaccount.com`
- **Private Key ID:** `f0aff750c48a884305d7b05363c449e05b675e5d`
- **Exposed in:** `credentials/AdminSetting/serviceAccountKey.json`
- **Git commits:** First committed in `8f9aa1e` (2025-07-08), removed in `7f9e813` (2026-03-21)
- **Exposure duration:** ~8 months in git history
- **Status:** [ ] PENDING ROTATION

### 3. Firebase Client API Key
- **Key:** `AIzaSyBZS_Bfl7Bj4axlFt8Pg3HebYzAbrqBDQs`
- **Exposed in:** Previously hardcoded in `src/firebaseConfig.js`, now in `.env.local`
- **Note:** Firebase client API keys are designed to be public, but should still be restricted via Google Cloud Console
- **Status:** [ ] PENDING RESTRICTION

---

## Required Rotation Steps

### Step 1: Rotate Service Account Keys

1. Go to [Firebase Console](https://console.firebase.google.com/project/commai-b98fe/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key" to create a replacement
3. Store the new key securely (never in the repo)
4. Go to [Google Cloud IAM](https://console.cloud.google.com/iam-admin/serviceaccounts?project=commai-b98fe)
5. Find the `firebase-adminsdk-fbsvc@commai-b98fe.iam.gserviceaccount.com` service account
6. Under "Keys" tab, **delete** the two compromised keys:
   - Key ID: `1136dd44...`
   - Key ID: `f0aff750...`
7. Verify deletion by attempting to use the old keys

### Step 2: Restrict API Key

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials?project=commai-b98fe)
2. Find the Browser key matching `AIzaSyBZS_Bfl7Bj4axlFt8Pg3HebYzAbrqBDQs`
3. Under "Application restrictions", set to "HTTP referrers" and add:
   - `https://commai-b98fe.web.app/*`
   - `https://commai-b98fe.firebaseapp.com/*`
   - `http://localhost:3000/*` (for development)
4. Under "API restrictions", limit to only:
   - Firebase Realtime Database API
   - Firebase Auth API
   - Cloud Functions API

### Step 3: Clean Git History (Optional but Recommended)

```bash
# Install BFG Repo-Cleaner
# Then run:
bfg --delete-files serviceAccountKey.json
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**WARNING:** Force push rewrites history for all collaborators. Coordinate with team before executing.

### Step 4: Audit Access Logs

1. Go to [Google Cloud Audit Logs](https://console.cloud.google.com/logs/query?project=commai-b98fe)
2. Filter for the compromised service account email
3. Check for any unauthorized access during the exposure window (2025-03-01 to present)
4. Look for suspicious operations: user creation, data reads, config changes

---

## Verification Checklist

After rotation, verify each item:

- [ ] Old service account key `1136dd44...` returns authentication error when used
- [ ] Old service account key `f0aff750...` returns authentication error when used
- [ ] New service account key works for Cloud Functions deployment
- [ ] API key restrictions are applied in Google Cloud Console
- [ ] Dashboard can still authenticate users
- [ ] Cloud Function `setUserPassword` still works with new credentials
- [ ] No service account keys exist anywhere in the repo working tree
- [ ] `.gitignore` blocks `credentials/`, `serviceAccountKey*.json`
- [ ] `git log --all -- credentials/` shows only historical deletions

---

## Ongoing Monitoring

- Set up Google Cloud alerts for service account key usage
- Review IAM audit logs monthly
- Ensure no new service account keys are created without team knowledge
