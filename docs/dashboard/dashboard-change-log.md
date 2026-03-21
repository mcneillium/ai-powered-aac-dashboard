# Dashboard Change Log

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
