# Hussain Maat Foundation - PRD

## Original Problem Statement
Build a mobile-responsive community fund management web app, "Hussain Maat Foundation", with role-based access for Members, Admins, and a Super Admin.

## Core Requirements
- **User Management:** Phone + PIN auth, role-based access (Member, Admin, Super Admin), admin CRUD on users
- **Fee Structure:** Single active monthly fee per year, yearly calculation, donations, admin collects on behalf
- **Fund Allocation:** Allocate for school fees, health, emergencies etc., track recipient info
- **Approval Workflow:** 2-admin approval for fees and allocations
- **Dashboards:** Member and Admin dashboards with stats
- **Bilingual:** English/Urdu with RTL support
- **Notifications:** In-app notifications

## Tech Stack
- **Backend:** FastAPI + MongoDB (motor async) + JWT auth
- **Frontend:** React + TailwindCSS + shadcn/ui + react-router
- **Database:** MongoDB

## Architecture
```
/app/
├── backend/
│   ├── server.py          # All API endpoints
│   ├── .env               # MONGO_URL, DB_NAME, JWT_SECRET
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js         # Routes
│   │   ├── components/
│   │   │   ├── AppLayout.js    # Sidebar, nav, back buttons, logo
│   │   │   └── ui/             # shadcn components
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── LanguageContext.js
│   │   ├── lib/
│   │   │   ├── translations.js
│   │   │   └── utils.js
│   │   └── pages/
│   │       ├── AdminDashboard.js
│   │       ├── MemberDashboard.js
│   │       ├── UserManagement.js
│   │       ├── FeeSubmission.js
│   │       ├── FundAllocation.js
│   │       ├── PendingApprovals.js
│   │       ├── AllocationHistory.js
│   │       ├── MonthlyFees.js
│   │       ├── Notifications.js
│   │       ├── LoginPage.js
│   │       └── SignupPage.js
│   └── .env
└── memory/
    └── PRD.md
```

## What's Been Implemented

### Phase 1 - Core (Complete)
- Full-stack setup (FastAPI + React + MongoDB)
- Role-based access control (Member, Admin, Super Admin)
- PIN-based authentication with Pakistani phone numbers
- Super Admin: +923142256184

### Phase 2 - Features (Complete)
- Bilingual support (English/Urdu) with RTL layout
- Yearly fee structure: admin sets monthly fee, system calculates yearly
- Fee collection: select member, year, months or full year, optional donation
- Fund allocation with recipient tracking (name, phone, category)
- Allocation history with tabular view
- Admin ability to add new members
- 2-admin approval workflow for fees and allocations
- In-app notifications

### Phase 3 - UI/UX Improvements (Complete - Feb 2026)
- **User Management:** Full CRUD - edit, delete, disable/enable users via tabular UI
- **Tabular Approvals:** Redesigned PendingApprovals from card to table format with one-click approve/reject
- **Bulk Actions:** Bulk select + bulk approve/reject on approvals, bulk disable/delete on users
- **Member Search:** Search on Fee Collection, User Management, Approvals pages
- **Admin Name Display:** Actual admin name shown in history, approvals, and submission records
- **Back Buttons:** Back navigation on all inner pages (mobile + desktop)
- **Branding:** HMF logo + "Hussain Maat Foundation" on login, signup, sidebar
- **Disabled User Blocking:** Disabled accounts cannot login (403 error)

## API Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with phone + PIN
- `GET /api/auth/me` - Get current user
- `GET /api/users` - List all users (admin)
- `POST /api/users/add-member` - Add member (super admin)
- `POST /api/users/promote` - Toggle role (super admin)
- `PUT /api/users/{id}` - Update user info (admin)
- `DELETE /api/users/{id}` - Delete user (admin)
- `POST /api/users/{id}/toggle-status` - Disable/enable (admin)
- `POST /api/users/bulk-action` - Bulk user actions (super admin)
- `POST /api/fee-config` - Set fee config (admin)
- `GET /api/fee-config` - Get all configs
- `GET /api/fee-config/active` - Get active config
- `POST /api/fee-submissions` - Submit fee (admin)
- `GET /api/fee-submissions` - List submissions
- `POST /api/fee-submissions/{id}/approve` - Vote on submission
- `POST /api/fee-submissions/bulk-approve` - Bulk vote
- `GET /api/fund-categories` - List categories
- `POST /api/fund-allocations` - Create allocation
- `GET /api/fund-allocations` - List allocations
- `POST /api/fund-allocations/{id}/approve` - Vote on allocation
- `POST /api/fund-allocations/bulk-approve` - Bulk vote
- `GET /api/dashboard/member` - Member stats
- `GET /api/dashboard/admin` - Admin stats
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/mark-read` - Mark all read

## Test Credentials
- **Super Admin:** +923142256184 / PIN: 1234

## Backlog / Future Enhancements
- P1: Export reports (PDF/Excel) for collections and allocations
- P2: SMS notifications for payment reminders
- P2: Member self-service portal for viewing payment history
- P3: Analytics dashboard with charts and trends

## PWA & Mobile App (Implemented Feb 2026)
- **PWA:** manifest.json, service worker (sw.js), app icons, meta tags for install-to-home-screen
- **TWA APK:** Complete Android TWA project at `/app/twa-apk/` and downloadable ZIP at `/HMF-TWA-Android.zip`
- PWA works on both Android & iOS, TWA APK is Android-only
- APK must be built on a machine with Android SDK (ARM server can't compile AAPT2)
