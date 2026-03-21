# Dashboard Audit Report

**Date:** 2026-03-21 (updated: 2026-03-21)
**Auditor:** Dashboard Architecture & UX Lead + Security Hardening Lead
**Scope:** Full codebase review of ai-powered-aac-dashboard

> **See also:** `/docs/audit/final-dashboard-audit.md` for the post-hardening security audit.
> **See also:** `/docs/security/post-rotation-verification.md` for credential rotation checklist.

---

## 1. Security Findings

### CRITICAL - Service Account Keys in Repository
- **Finding:** `credentials/serviceAccountKey.json` and `credentials/AdminSetting/serviceAccountKey.json` were committed to git with full private keys
- **Risk:** Full admin access to Firebase project for anyone with repo access
- **Remediation:** Removed from git tracking, added to `.gitignore`, keys should be rotated in Firebase Console
- **Status:** FIXED (git tracking removed)
- **Action Required:** Rotate keys in Firebase Console immediately

### CRITICAL - Unprotected Cloud Function
- **Finding:** `setUserPassword` Cloud Function had no authentication or authorization checks. Any HTTP client could set any user's password
- **Risk:** Complete account takeover for any user
- **Remediation:** Added Bearer token verification, admin role check, server-side password validation, CORS origin restriction
- **Status:** FIXED

### HIGH - Firebase Config Hardcoded
- **Finding:** Firebase API keys hardcoded in `src/firebaseConfig.js`
- **Risk:** While Firebase API keys are designed to be public, hardcoding prevents per-environment configuration
- **Remediation:** Moved to environment variables via `REACT_APP_FIREBASE_*` pattern with `.env.example` template
- **Status:** FIXED

### HIGH - No Role-Based Route Guards
- **Finding:** `PrivateRoute` only checked authentication, not authorization. Admin pages (AdminDashboard, UserManagement, Caregivers) accessible by any authenticated user via direct URL
- **Risk:** Caregivers could access admin functionality
- **Remediation:** Added `requiredRole` prop to PrivateRoute, admin-only routes now enforce `requiredRole="admin"`
- **Status:** FIXED

### MEDIUM - Role Source Inconsistency
- **Finding:** Auth role fetched from Realtime Database (`users/{uid}/role`) which is client-writable, instead of Firebase custom claims
- **Risk:** Users could potentially elevate their role
- **Remediation:** AuthContext now checks custom claims first, falls back to database
- **Status:** FIXED

### LOW - Console Logging of Sensitive Data
- **Finding:** Various `console.log` calls outputting user claims, IDs, and other data
- **Remediation:** Removed unnecessary console.log statements, kept error logging
- **Status:** FIXED

---

## 2. Architecture Findings

### React Native AsyncStorage in Web App
- **Finding:** `src/utils/logger.js` imported `@react-native-async-storage/async-storage` which is not a web-compatible library and was not in `package.json`
- **Risk:** Runtime crash if logger was invoked
- **Remediation:** Rewrote logger to use `localStorage` with Firebase push and offline fallback queue
- **Status:** FIXED

### No Shared Layout/Navigation
- **Finding:** No consistent navigation across pages. Each page was standalone with no sidebar or app bar
- **Remediation:** Created `DashboardLayout` component with responsive sidebar, role-based nav items, user info panel
- **Status:** FIXED

### No MUI Theme
- **Finding:** Default MUI theme used throughout. Hardcoded colors like `#4CAF50`, `#f2f2f2` scattered across components
- **Remediation:** Created custom MUI theme with CommAI branding (green primary, blue secondary), consistent typography and component overrides
- **Status:** FIXED

### firebase-admin in Client Dependencies
- **Finding:** `firebase-admin` (server-side SDK) listed in client `package.json`
- **Risk:** Bloated bundle, potential key exposure patterns
- **Recommendation:** Remove from client package.json; it belongs only in `functions/package.json`
- **Status:** NOTED (requires package.json change coordination)

### Unused Dependencies
- **Finding:** TensorFlow.js packages (7 packages) included but no ML code in dashboard
- **Finding:** `recharts` included alongside `chart.js` (duplicate charting libraries)
- **Finding:** `react-icons` used in only one file
- **Recommendation:** Audit and remove unused packages to reduce bundle size
- **Status:** NOTED

---

## 3. UX Findings

### AdminDashboard
- **Before:** Basic table toggle (users/caregivers), minimal stats, no pagination, raw user IDs in logs
- **After:** Stats cards with icons, clickable navigation, paginated logs table, user name resolution, top-10 active users bar chart, unassigned users alert, filter chips, clear filters button
- **Status:** IMPROVED

### CaregiverDashboard
- **Before:** Simple list of assigned users with sync status cards. No activity data, no navigation
- **After:** Stats cards, recent activity table, connect users card, grid layout for user cards
- **Status:** IMPROVED

### Login/Signup
- **Before:** Basic forms with `alert()` for errors, inconsistent routing (`/Signup` instead of `/signup`)
- **After:** Proper error handling with Alert components, form submission on Enter, branding, loading states
- **Status:** IMPROVED

### User/Caregiver Management
- **Before:** Exposed "Add Dummy Users" button in production, no pagination, inline IDs displayed
- **After:** Collapsible add forms, pagination, search with icon, caregiver name resolution, cleaner table layout
- **Status:** IMPROVED

### Logs
- **Before:** No search, no pagination, hardcoded background colors
- **After:** Search bar, pagination, clean theme-based styling
- **Status:** IMPROVED

---

## 4. Test Coverage

### Before
- 1 test file (`Login.test.js`) with basic render check (24 lines)

### After
- `Login.test.js` - 4 tests (form rendering, input, branding, navigation)
- `AuthContext.test.js` - 4 tests (loading state, null auth, admin role, provider requirement)
- `PrivateRoute.test.js` - 5 tests (loading, redirect, auth, role check, role mismatch)
- `logger.test.js` - 4 tests (Firebase push, offline fallback, flush, empty flush)
- `Signup.test.js` - 2 tests (form rendering, sign-in link)

**Total: 19 tests across 5 test files**

---

## 5. Recommendations for Future Work

### Priority 1 - Security
1. Rotate all Firebase service account keys
2. Add Firebase Security Rules for Realtime Database (currently no rules in repo)
3. Remove `firebase-admin` from client package.json
4. Add rate limiting to Cloud Functions
5. Implement CSRF protection

### Priority 2 - Architecture
1. Add TypeScript for type safety
2. Implement proper error boundary component
3. Add service layer abstraction for Firebase operations
4. Implement proper loading/error/empty states consistently
5. Add E2E testing with Cypress or Playwright

### Priority 3 - Performance
1. Remove unused TensorFlow.js packages from client bundle
2. Implement code splitting / lazy loading for routes
3. Add proper Firebase query indexing
4. Implement data caching with React Query or SWR

### Priority 4 - DevOps
1. Add CI/CD pipeline (GitHub Actions)
2. Add build verification
3. Add automated test running on PR
4. Add Firebase deployment automation

---

## Shared Contracts (Mobile/Backend Coordination)

### Database Schema (`/users/{uid}`)
```json
{
  "name": "string",
  "email": "string",
  "role": "admin | caregiver | null",
  "caregiverId": "string | null",
  "createdAt": "timestamp"
}
```

### Database Schema (`/caregivers/{id}`)
```json
{
  "name": "string",
  "email": "string"
}
```

### Database Schema (`/userLogs/{id}`)
```json
{
  "targetUserId": "string",
  "carerId": "string",
  "userId": "string (legacy)",
  "action": "string",
  "timestamp": "number (epoch ms)"
}
```

### Database Schema (`/userSync/{userId}`)
```json
{
  "lastActivity": "number (epoch ms)"
}
```

### Cloud Function Endpoints
- `POST /setUserPassword` - Requires Bearer token (admin role)
  - Body: `{ uid: string, newPassword: string }`
  - Region: `europe-west1`
