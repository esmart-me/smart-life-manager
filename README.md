# Smart Life Manager (Phase 1 Foundation)

Smart Life Manager is a personal life management web application designed around a single core mission:
> **"Never miss an important expiry date, payment, reminder, or important life event."**

This repository contains the **Phase 1: Project Foundation & Architecture**, engineered for production reliability, multi-tenant security, and effortless maintenance for a beginner collaborating with AI assistants.

---

## 1. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Modern full-stack architecture, React Server Components (RSC) |
| **Language** | TypeScript (Strict Mode) | Type-safe DTOs, interfaces, and end-to-end reliability |
| **Styling** | Tailwind CSS + CSS Variables | Responsive, mobile-first design with light/dark theme support |
| **Icons** | Lucide React | Clean, modern iconography |
| **Database & ORM** | Prisma ORM with SQLite (Local) | Fully relational database schema with foreign keys & indexes |
| **Authentication** | JWT Session via `jose` + `bcryptjs` | HttpOnly, SameSite=Lax, Secure cookies with server-side validation |
| **Route Protection** | Next.js Edge Middleware (`middleware.ts`) | Strict HTTP 307 redirects for unauthenticated access |
| **Storage Vault** | Abstraction (`IStorageProvider`) | Secure private document vault kept outside the public web root |

---

## 2. Directory Structure

```text
d:/MyApp/
├── .env.example             # Configuration template
├── .env                     # Local environment settings (gitignored)
├── .gitignore               # Strict gitignore (node_modules, .next, .env, dev.db)
├── package.json             # Core scripts and locked dependencies
├── tsconfig.json            # Strict TypeScript configuration (@/* alias)
├── tailwind.config.ts       # Design system tokens and dark mode config
├── next.config.ts           # Production Next.js settings
├── prisma/
│   ├── schema.prisma        # Relational database schema with 14 models
│   └── seed.js              # Database seed script for initial testing
├── scripts/
│   └── verify-app.js        # Automated verification test suite
├── src/
│   ├── middleware.ts        # Route protection & security middleware
│   ├── types/
│   │   └── index.ts         # Central TypeScript interfaces, DTOs & API responses
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── session.ts   # Secure JWT cookie management & getCurrentUser()
│   │   │   └── password.ts  # bcrypt hashing and comparison
│   │   ├── db/
│   │   │   ├── prisma.ts    # PrismaClient singleton with hot-reload guard
│   │   │   └── scoped-query.ts # Server-side tenant isolation enforcement
│   │   ├── storage/
│   │   │   └── storage-provider.ts # Secure document storage architecture
│   │   ├── constants.ts     # Navigation items, configuration constants
│   │   └── utils.ts         # Utility helpers (cn, dates, currencies)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx        # Responsive top header
│   │   │   ├── DesktopSidebar.tsx   # Desktop navigation sidebar
│   │   │   ├── MobileBottomNav.tsx  # Mobile 5-tab bottom navigation
│   │   │   └── ThemeToggle.tsx      # Hydration-safe light/dark switch
│   │   ├── ui/
│   │   │   ├── Button.tsx           # Accessible button with loading spinner
│   │   │   ├── Card.tsx             # Card primitive components
│   │   │   ├── Input.tsx            # Form input with validation states
│   │   │   ├── Badge.tsx            # Category & status badges
│   │   │   ├── Skeleton.tsx         # Shimmer loading skeletons
│   │   │   ├── EmptyState.tsx       # Zero-data state visual helper
│   │   │   └── AlertBanner.tsx      # Notification and error banners
│   │   ├── dashboard/
│   │   │   ├── WelcomeBanner.tsx    # Greeting, real date & status pill
│   │   │   ├── QuickActions.tsx     # 4 primary entry points
│   │   │   ├── AttentionRequired.tsx# Urgent alerts or clean empty state
│   │   │   └── UpcomingSection.tsx  # Chronological deadlines empty state
│   │   └── settings/
│   │       └── SettingsForm.tsx     # Interactive settings & preferences form
│   └── app/
│       ├── layout.tsx       # Root layout with ThemeProvider and metadata
│       ├── loading.tsx      # Global loading state
│       ├── error.tsx        # Global error boundary with recovery action
│       ├── not-found.tsx    # Custom 404 page
│       ├── globals.css      # Design tokens and color-scheme declaration
│       ├── (auth)/          # Authentication routes
│       │   ├── layout.tsx   # Auth container layout
│       │   ├── login/page.tsx
│       │   └── register/page.tsx
│       ├── (dashboard)/     # Authenticated application shell
│       │   ├── layout.tsx   # Sidebar + Mobile Nav + Header
│       │   ├── page.tsx     # Dashboard shell (Welcome, Today, Actions, Empty states)
│       │   ├── documents/page.tsx
│       │   ├── reminders/page.tsx
│       │   ├── finance/page.tsx
│       │   ├── more/page.tsx
│       │   └── settings/page.tsx
│       └── api/             # Secure REST endpoints
│           ├── auth/
│           │   ├── login/route.ts
│           │   ├── register/route.ts
│           │   ├── logout/route.ts
│           │   └── me/route.ts
│           ├── health/route.ts
│           └── user/settings/route.ts
```

---

## 3. Database Schema Overview

The relational schema (`prisma/schema.prisma`) prepares the data architecture for all required life management domains:

1. **`User`**: Account identity, hashed passwords, roles (`user` \| `admin`).
2. **`Profile`**: Personal details (name, phone, currency, timezone, locale).
3. **`UserSetting`**: Theme preference, email/push notification controls, alert window (days before).
4. **`Document`**: Category, document number, issuing authority, issue date, and expiry date.
5. **`DocumentFile`**: Metadata for private encrypted files (storage key, MIME, size, checksum).
6. **`Reminder`**: Priority (`urgent`, `high`, `medium`, `low`), status (`pending`, `completed`, `snoozed`), due dates, recurrence.
7. **`Payment`**: Payee, amount, currency, due date, payment status, recurring frequency.
8. **`Expense`**: Amount, category, transaction date, payment method, merchant.
9. **`Budget`**: Category limit, threshold alert percentage, period (`monthly`, `weekly`).
10. **`Vehicle`**: Make, model, year, plate, VIN, registration expiry, insurance expiry.
11. **`Subscription`**: Cost, billing cycle, renewal status, next billing date.
12. **`ImportantDate`**: Title, event date, recurrence (`yearly`), reminder advance window.
13. **`FamilyMember`**: Name, relationship, birthdate, emergency contact toggle.
14. **`Notification`**: System alerts, status changes, and deep links.
15. **`Session`**: Optional server-side session revocation tracking.

> **Security Rule**: Every record contains a `userId` foreign key referencing `User(id)` with `onDelete: Cascade` and indexed foreign keys (`@@index([userId])`). Database access is strictly scoped to the authenticated user on the server.

---

## 4. How to Run Locally

### Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build and Run for Production
```bash
npm run build
npm start
```

### Seed Default Demo Account
```bash
npm run db:seed
```
* **Email:** `demo@smartlifemanager.local`
* **Password:** `SmartLife2026!`

### Run Automated Verification Test Suite
```bash
node scripts/verify-app.js
```

---

## 5. Security Architecture Highlights

* **No Frontend Trust**: Authentication and authorization are enforced server-side inside `middleware.ts`, Server Components (`requireUser()`), and API route handlers.
* **HttpOnly Session Cookies**: Session tokens are encrypted and transmitted using `HttpOnly`, `SameSite=Lax`, and `Secure` attributes, safeguarding against XSS token theft.
* **Multi-tenant Data Scoping**: All Prisma queries use `where: { userId: user.id }` via `src/lib/db/scoped-query.ts`.
* **Zero Fake Data**: The dashboard and module pages dynamically read live scoped records; when empty, clean informative empty states are displayed instead of hardcoded numbers.
