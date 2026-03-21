# Dashboard Change Log

## 2026-03-21 - Security Hardening & Production Readiness Pass

### Security Hardening
- **Removed database role fallback from AuthContext** - Roles now sourced EXCLUSIVELY from Firebase custom claims (tamper-proof). Database fallback was a privilege escalation vector.
- **Created Firebase Realtime Database security rules** (`database.rules.json`) - Per-node access control: role writes admin-only, caregiver assignment scoped, log validation, default-deny on unknown paths.
- **Added database rules to firebase.json** - Deployable via `firebase deploy --only database`.
- **Created post-rotation verification checklist** - Full incident response documentation for compromised keys.
- **Created secret-handling guide** - Covers env vars, service account management, pre-commit prevention, incident response.

### Dependency Cleanup
- **Removed `firebase-admin` from client package.json** - Server-side SDK incorrectly in client bundle; already in `functions/package.json`.
- **Removed `react-icons`** - Unused after refactor (MUI icons used throughout).
- **Removed `recharts`** - Unused duplicate charting library (chart.js already in use).

### Code Quality
- **UserActions page** - Added loading state, pagination, back navigation, consistent theme styling, removed raw ID display.
- **FineTuneMetrics page** - Added loading state, removed `console.log` data leak, themed chart colors.
- **SyncStatusCard** - Replaced hardcoded `#f0f4f8` with theme-aware styling, added active/inactive icon.
- **AdminDashboard** - Removed unused `uniqueActions` computed value.
- **DashboardLayout** - Removed unused `AssessmentIcon` import.

### Test Coverage (expanded)
- **AuthContext tests** - Added caregiver role test, null-claim test (6 tests total, up from 4).
- **Cloud Functions security tests** - 8 new tests verifying auth, RBAC, validation, CORS, method restriction, logging safety, error handling.
- **Total: 29 tests across 6 files** (up from 19 across 5 files).

### Documentation
- `/docs/security/secret-handling.md` - NEW
- `/docs/security/post-rotation-verification.md` - NEW
- `/docs/audit/final-dashboard-audit.md` - NEW
- `/docs/dashboard/dashboard-release-readiness.md` - NEW (includes shared contracts)

### Files Changed
- `src/contexts/AuthContext.js` - Removed database role fallback
- `src/pages/UserActions.js` - Loading, pagination, styling
- `src/pages/FineTuneMetrics.js` - Loading, removed console.log, theme
- `src/pages/AdminDashboard.js` - Removed dead code
- `src/components/SyncStatusCard.js` - Theme-aware redesign
- `src/components/layout/DashboardLayout.js` - Removed unused import
- `database.rules.json` - NEW: Firebase RTDB security rules
- `firebase.json` - Added database rules config
- `package.json` - Removed firebase-admin, react-icons, recharts
- `__tests__/AuthContext.test.js` - Expanded tests
- `__tests__/cloudFunctions.test.js` - NEW: 8 security contract tests

---

## 2026-03-21 - Architecture, Security & UX Overhaul

### Security
- **Removed service account keys from git tracking** - `credentials/` directory excluded via `.gitignore` and `git rm --cached`
- **Moved Firebase config to environment variables** - `REACT_APP_FIREBASE_*` pattern with `.env.example` template for onboarding
- **Hardened Cloud Function (`setUserPassword`):**
  - Added Bearer token authentication (Firebase ID token verification)
  - Added admin role authorization check
  - Added server-side password validation (length, complexity)
  - Restricted CORS origins to known domains
  - Added self-password-change prevention
  - Added proper error responses (401, 403, 400, 404, 500)
  - Deployed to `europe-west1` region
- **Implemented role-based route guards** - `PrivateRoute` now accepts `requiredRole` prop; admin pages require `admin` role
- **Fixed auth role resolution** - AuthContext now checks Firebase custom claims first, falls back to database

### Architecture
- **Fixed logger utility** - Replaced React Native `AsyncStorage` import with web-compatible `localStorage` + direct Firebase push with offline fallback queue
- **Created custom MUI theme** (`src/theme.js`) - CommAI green branding, consistent typography, component style overrides
- **Created shared layout** (`DashboardLayout`) - Responsive sidebar navigation with role-based menu items, user info panel, mobile hamburger menu
- **Upgraded AuthContext** - Added `userRole`, `isCaregiver` state, `ROLES` constants, `useCallback` for signIn/signOut, provider check in `useAuth()`
- **Added `ThemeProvider` and `CssBaseline`** to App.js
- **Added `React.StrictMode`** to index.js
- **Centralized toast position** to bottom-right

### UX Improvements
- **AdminDashboard:**
  - Added 4 clickable stats cards (total users, caregivers, today's activities, weekly active)
  - Added unassigned users warning alert with action button
  - Improved charts: activity trends with area fill, pie chart with full action names (top 7), bar chart shows top 10 most active users by name
  - Added time frame chips (Day/Week/Month/Year)
  - Added paginated logs table with user name resolution
  - Added clear filters button
  - Removed users/caregivers table toggle (moved to dedicated management pages)
- **CaregiverDashboard:**
  - Added stats cards (assigned users, today's activity)
  - Added "Connect Users" action card
  - Added recent activity table with assigned user filtering
  - Grid layout for user cards
  - Empty state with call-to-action
- **Login page:**
  - Replaced `alert()` with inline Alert components
  - Added human-readable error messages for common Firebase auth errors
  - Added form submission on Enter key
  - Added CommAI branding and tagline
  - Wrapped in centered Paper card
- **Signup page:**
  - Added input validation before submission
  - Added error handling with Alert component
  - Added loading state
  - Consistent branding with Login page
- **UserManagement:**
  - Removed "Add Dummy Users" button
  - Collapsible add user form with toggle button
  - CSV import integrated into add form section
  - Added caregiver name resolution in table (shows name instead of ID)
  - Added table pagination (15/30/50 rows)
  - Search field with icon
  - Unassigned users shown with warning chip
- **Caregivers page:**
  - Used `useAuth()` instead of local isAdmin state
  - Collapsible add form
  - Icon buttons for edit/delete
  - Connected users shown as chips
  - Table pagination
  - View-only mode alert for non-admins
- **Logs page:**
  - Added search bar
  - Added table pagination (25/50/100 rows)
  - Increased fetch limit to 500
  - Cleaner layout with entry count
- **ConnectUser page:**
  - Uses `useAuth()` for current user
  - Added search with icon
  - Empty state alert
  - Connect button with icon
- **SetPasswordForm:**
  - Switched from `httpsCallable` to direct `fetch()` with Bearer token auth
  - Memoized password strength calculation
  - Cleaner layout

### Tests (New)
- `Login.test.js` - 4 tests (form render, input, branding, sign-up link)
- `AuthContext.test.js` - 4 tests (loading, null auth, admin role, provider requirement)
- `PrivateRoute.test.js` - 5 tests (loading, redirect, auth, role check, role mismatch)
- `logger.test.js` - 4 tests (Firebase push, offline fallback, flush, empty flush)
- `Signup.test.js` - 2 tests (form render, sign-in link)

### Files Changed
- `src/firebaseConfig.js` - Environment variables
- `src/App.js` - ThemeProvider, layout, role guards
- `src/index.js` - StrictMode, toast position
- `src/PrivateRoute.js` - Role-based guards
- `src/contexts/AuthContext.js` - Enhanced auth context
- `src/theme.js` - NEW: MUI theme
- `src/components/layout/DashboardLayout.js` - NEW: Shared layout
- `src/utils/logger.js` - Web-compatible rewrite
- `src/pages/AdminDashboard.js` - Complete redesign
- `src/pages/CaregiverDashboard.js` - Complete redesign
- `src/pages/Login.js` - Error handling, branding
- `src/pages/Signup.js` - Validation, branding
- `src/pages/UserManagement.js` - UX improvements
- `src/pages/Caregivers.js` - UX improvements
- `src/pages/Logs.js` - Search, pagination
- `src/pages/ConnectUser.js` - UX cleanup
- `src/pages/SetPasswordForm.js` - Auth token support
- `functions/index.js` - Auth, CORS, validation hardening
- `.gitignore` - Credentials exclusion
- `.env.example` - NEW: Environment template
- `.env.local` - NEW: Local environment config
- `docs/audit/dashboard-audit.md` - NEW: Audit report
- `docs/dashboard/dashboard-change-log.md` - NEW: This file
- `__tests__/` - 5 test files (19 total tests)
