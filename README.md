# AI-Powered AAC Caregiver Dashboard

A React web dashboard for managing the **CommAI** AAC (Augmentative and Alternative Communication) system. This dashboard is used by **admins** and **caregivers** to manage users, monitor activity, and oversee the companion React Native AAC app.

## What This Project Does

- **Admin Dashboard** — View all users, caregivers, activity logs, and analytics charts
- **Caregiver Dashboard** — View assigned AAC app users and their sync status
- **User Management** — Add, edit, and assign users to caregivers (admin only)
- **Caregiver Management** — Add, edit, delete caregivers; CSV bulk import (admin only)
- **Activity Logs** — View and filter user interaction logs from the AAC app
- **Fine-Tune Metrics** — Visualize ML model training progress (loss/accuracy)
- **Connect User** — Caregivers can self-assign to unassigned AAC app users

## How It Connects to the AAC App

This dashboard shares a **Firebase Realtime Database** backend with the companion React Native AAC app. Both read/write to the same data:

| RTDB Path | Dashboard | AAC App |
|---|---|---|
| `users/` | Read/Write (manage users) | Read/Write (user profiles) |
| `caregivers/` | Read/Write (manage caregivers) | Read |
| `userLogs/` | Read (view logs) | Write (log user activity) |
| `userSync/{userId}` | Read (sync status) | Write (last activity) |
| `fineTuneMetrics/` | Read (charts) | Write (training metrics) |

**Do NOT change collection paths or field names** without coordinating with the AAC app team.

## Role & Permission Model

Roles are set via **Firebase Auth custom claims** (set using admin scripts in `credentials/`).

| Role | Access |
|---|---|
| `admin` | Full access: all dashboards, user/caregiver management, logs |
| `caregiver` | Caregiver dashboard, connect user, view own users' logs |
| (no role) | Redirected to home/login |

Route protection is enforced via `PrivateRoute` with optional `requiredRole` prop.

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Realtime Database and Authentication enabled

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Firebase config values:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Description |
|---|---|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `REACT_APP_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID |

### Setting Up an Admin User

Use the script in `credentials/AdminSetting/setAdmin.js`:
```bash
node credentials/AdminSetting/setAdmin.js
```
This sets the `role: "admin"` custom claim on the specified UID.

### Running Tests

```
npm test
```

Tests cover: login rendering, AuthContext role logic, input sanitization utilities.

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Run dev server on port 3000 |
| `npm test` | Run test suite |
| `npm run build` | Production build to `build/` |

## Project Structure

```
src/
  App.js                    # Routes and app shell
  PrivateRoute.js           # Auth + role-based route guard
  firebaseConfig.js         # Firebase initialization
  theme.js                  # MUI theme (colors, typography)
  contexts/
    AuthContext.js           # Auth state, role detection via custom claims
  components/
    ErrorBoundary.js         # Top-level crash recovery UI
    SyncStatusCard.js        # User last-sync display
    DashboardCharts.js       # Memoized chart components
    chartOptions.js          # Shared Chart.js configuration
  pages/
    Login.js                 # Email/password login
    Signup.js                # User registration
    Home.js                  # Role-based redirect
    AdminDashboard.js        # Admin overview with charts and tables
    CaregiverDashboard.js    # Caregiver's assigned users view
    Caregivers.js            # Admin caregiver CRUD
    ConnectUser.js           # Caregiver self-assignment
    UserManagement.js        # Admin user CRUD
    UserActions.js           # Per-user activity log
    Logs.js                  # Filterable activity log
    FineTuneMetrics.js       # ML training charts
    SetPasswordForm.js       # Admin password reset form
  services/
    firebase.js              # Centralized RTDB helpers and path constants
  utils/
    sanitize.js              # Input sanitization helpers
    logger.js                # Local activity logging utility
```

## Security Notes

- Firebase config values should be set via environment variables (see `.env.example`)
- Service account keys must NEVER be committed to git (see `.gitignore`)
- The `setUserPassword` Cloud Function requires admin authentication
- All user inputs are sanitizable via `src/utils/sanitize.js`
- No `dangerouslySetInnerHTML` is used anywhere in the codebase
