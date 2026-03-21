# Secret Handling Guide

**Project:** CommAI Dashboard
**Last Updated:** 2026-03-21

---

## Principles

1. **Never commit secrets to git.** All credentials, API keys, private keys, and tokens must be excluded from version control.
2. **Use environment variables.** Client-side configuration goes in `.env.local` (git-ignored). Server-side config uses Firebase Functions config or GCP Secret Manager.
3. **Rotate on exposure.** If any secret is accidentally committed, treat it as compromised immediately. Rotate before removing from history.
4. **Least privilege.** Each credential should have the minimum permissions required for its purpose.

---

## Client-Side (React Dashboard)

### Environment Variables

All Firebase client config is loaded from environment variables prefixed with `REACT_APP_`:

| Variable | Purpose | Sensitivity |
|----------|---------|-------------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase client API key | Low (restricted by domain) |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Low |
| `REACT_APP_FIREBASE_DATABASE_URL` | Realtime Database URL | Low |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID | Low |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Storage bucket | Low |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Low |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID | Low |
| `REACT_APP_FIREBASE_FUNCTIONS_REGION` | Cloud Functions region | Low |
| `REACT_APP_SET_PASSWORD_URL` | Cloud Function URL (optional) | Low |

### Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase project values
3. `.env.local` is git-ignored and never committed

### Note on Firebase API Keys

Firebase client API keys are designed to be public (they're embedded in every client app). Their security comes from:
- Firebase Auth rules (who can authenticate)
- Database security rules (who can read/write what)
- API key restrictions in Google Cloud Console (domain restrictions)

Despite being low-sensitivity, we still use environment variables to:
- Support multiple environments (dev/staging/prod)
- Avoid accidental hardcoding habits
- Make key rotation easier

---

## Server-Side (Cloud Functions)

### Firebase Admin SDK

Cloud Functions use the Firebase Admin SDK, which authenticates via:
- **Service account key files** (for local development only)
- **Default credentials** (in production, auto-provided by GCP)

**NEVER** commit service account key files. They grant full admin access to your Firebase project.

For local development:
```bash
# Download key from Firebase Console > Project Settings > Service Accounts
# Store OUTSIDE the repo directory
export GOOGLE_APPLICATION_CREDENTIALS="/path/outside/repo/serviceAccountKey.json"
```

### Cloud Function Secrets

If Cloud Functions need additional secrets (API keys for external services, etc.):
```bash
# Use Firebase Functions config
firebase functions:config:set service.key="value"

# Or use GCP Secret Manager (preferred)
gcloud secrets create MY_SECRET --data-file=secret.txt
```

---

## Files That Must NEVER Be Committed

The `.gitignore` file blocks these patterns:

```
credentials/
serviceAccountKey*.json
**/serviceAccountKey*.json
.env
.env.local
.env.production
.firebase/
```

---

## Incident Response: What To Do If a Secret Is Committed

1. **Do NOT just delete the file and commit.** The secret is in git history forever.
2. **Rotate the secret immediately** in the relevant service (Firebase Console, GCP IAM, etc.).
3. **Remove from git history** using `git filter-repo` or BFG Repo-Cleaner.
4. **Force push** the cleaned history (coordinate with team).
5. **Audit access logs** for any unauthorized usage of the compromised key.
6. **Document the incident** in the security audit log.

---

## Pre-Commit Prevention

### Recommended: git-secrets

Install and configure `git-secrets` to scan commits for known secret patterns:

```bash
# Install
brew install git-secrets  # macOS
# or
pip install git-secrets   # cross-platform

# Configure patterns for this repo
git secrets --install
git secrets --register-aws  # catches AWS keys
git secrets --add 'AIzaSy[0-9A-Za-z_-]{33}'  # Firebase API keys
git secrets --add '"private_key"'  # Service account keys
git secrets --add 'BEGIN (RSA )?PRIVATE KEY'  # Private keys
```

### Manual Review Checklist

Before every commit, verify:
- [ ] No `.json` files with `private_key` fields
- [ ] No `.env` files with real values
- [ ] No hardcoded API keys in source files
- [ ] `git diff --cached` shows no credential-like strings
