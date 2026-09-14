# Architecture Document

## 1. Overview

`bimbel-lms` is a monolithic modular LMS built with Next.js App Router. The app currently serves as a full-stack web application where UI rendering, route protection, and data access are handled inside the Next.js codebase, with Supabase providing authentication, Postgres, and storage, and Prisma used for structured database access.

This document describes:
- the current architecture that exists in the codebase,
- the intended Next.js best-practice architecture for this project,
- likely failure points,
- and recommended corrections when the current implementation drifts from best practice.

## 2. Current Architecture in the Codebase

### 2.1 Runtime and framework

Current stack observed in the repository:
- Next.js 16.3.2 with App Router
- React 19
- TypeScript
- Bun as package manager/runtime target
- Prisma 7.x
- Supabase SDK and SSR helper
- Tailwind CSS v4
- shadcn/ui patterns
- Zod for validation
- React Hook Form for forms

### 2.2 App Router structure

The current route structure uses role-based route grouping and top-level application routes:
- `app/page.tsx` redirects users from `/` to `/login`
- `app/login/page.tsx` handles login
- `app/change-password/page.tsx` forces password update flow
- `app/student/*` contains student dashboard and student-facing pages
- `app/admin/*` contains admin dashboard and admin management pages
- `app/tutor/*` contains tutor dashboard and tutor management pages

Observed route protection pattern:
- `proxy.ts` blocks unauthenticated access to protected areas and redirects to `/login`
- `app/student/layout.tsx` and `app/admin/layout.tsx` perform role-based authorization checks in the server layer
- password change is enforced by redirecting users with `mustChangePassword`

### 2.3 Data and access model

The project is designed as a single application with server-side data access:
- Supabase Auth is used for login/session handling
- Prisma is used for structured database queries
- Supabase Storage is used for file/document assets
- Server Actions are used for mutations instead of a separate API service in many flows
- RLS is expected to protect data access at the database layer

### 2.4 Current functional areas visible in code

The codebase already contains implementation for:
- authentication and password change flows
- student dashboard
- tutor dashboard
- admin dashboard
- blog/category management pages
- role-based layout protection
- redirect-based access control

## 3. Recommended Next.js Architecture for This Project

### 3.1 Recommended layering

Use a clear separation of concerns:

- **Route layer**: `app/**` for pages, layouts, loading, error, and route handlers
- **Domain/data layer**: `lib/data/*` for server-side read queries
- **Mutation layer**: `lib/actions/*` for Server Actions
- **Validation layer**: `lib/validations/*` with Zod schemas
- **UI layer**: `components/*` for reusable presentation and feature components
- **Infrastructure layer**: `lib/supabase/*`, `lib/prisma/*`, storage helpers, session helpers
- **Configuration layer**: `config/*` for institution branding and feature flags

### 3.2 Route organization recommendation

Prefer App Router route groups for future growth:
- `(public)` for landing pages, public course/catalog pages, and marketing content
- `(auth)` for login and recovery flows
- `(student)` for student areas
- `(tutor)` for tutor areas
- `(admin)` for admin areas
- `api/` only when a true HTTP endpoint is needed, such as webhooks

This keeps UI boundaries clean and makes access rules easier to reason about.

### 3.3 Server-first rendering

For this LMS, default to Server Components when possible:
- fetch protected dashboard data on the server
- use client components only for interactive forms, drag-and-drop, rich editors, or stateful widgets
- avoid duplicating data fetching between client and server unless absolutely needed

### 3.4 Mutations

Use Server Actions for most authenticated mutations:
- login/logout
- password change
- create/update course data
- blog publish workflows
- user management actions

Use route handlers only when an external HTTP callback is required, such as payment webhooks or third-party callbacks.

## 4. Current Strengths

The current codebase already follows several good practices:
- App Router is used instead of legacy Pages Router
- route protection is handled at both proxy and layout levels
- metadata is defined at page/layout level
- the project is already structured around role-based dashboards
- architecture matches the roadmap documented in `docs/SDD.md` and `docs/Implementation-Plan.md`

## 5. Likely Failure Points and Best Corrections

### 5.1 Route protection duplication

**Failure mode:** authorization rules are duplicated across proxy, layouts, and page components, causing inconsistent behavior.

**Best correction:**
- centralize auth/session lookup in one helper
- centralize role checks in small reusable guard functions
- keep `proxy.ts` only for coarse unauthenticated gating and redirects
- keep finer role logic in server layouts or dedicated guard utilities

### 5.2 Mixing server and client responsibilities

**Failure mode:** client components perform data fetching or business logic that should live on the server.

**Best correction:**
- move read queries to server-only data helpers
- keep client components focused on UI interactions
- pass fetched data into client components as props when interactivity is needed

### 5.3 Inconsistent password-change enforcement

**Failure mode:** some routes allow access even when `mustChangePassword` is true.

**Best correction:**
- enforce the redirect in every protected route group layout
- ensure password-change flow is checked before rendering protected content
- keep the redirect target consistent

### 5.4 Repeated role checks across pages

**Failure mode:** every page reimplements admin/tutor/student authorization checks.

**Best correction:**
- create one guard helper per role group
- use that helper in layouts instead of page-level checks
- keep shared authorization logic in `lib/auth/` or `lib/guards/`

### 5.5 Hardcoded branding or institution data

**Failure mode:** institution name, color, logo, or copy is embedded directly in components.

**Best correction:**
- source branding from `config/institution.ts`
- use environment variables for deployment-specific values
- avoid static copy in shared UI if it belongs to institution configuration

### 5.6 Overusing client components

**Failure mode:** the app becomes heavier and slower because too many pages are marked `use client`.

**Best correction:**
- make forms client-only when necessary
- keep dashboard shells and data pages server-rendered
- isolate interactivity into the smallest possible child component

### 5.7 Weak validation boundaries

**Failure mode:** request payloads are validated only in the UI.

**Best correction:**
- validate again in Server Actions and route handlers with Zod
- never trust client-side form validation alone
- share schema objects across client and server when appropriate

### 5.8 Accessing database from the wrong side

**Failure mode:** Supabase or Prisma access is scattered across components without a clear boundary.

**Best correction:**
- keep Prisma usage in server-only modules
- keep Supabase client creation in dedicated helpers
- do not import server-only database code into client components

## 6. Suggested File-Level Best-Practice Shape

A clean target structure for this project would be:

- `app/` for routes and layouts
- `components/` for reusable UI and feature components
- `lib/actions/` for Server Actions
- `lib/data/` for server reads and queries
- `lib/auth/` for session and authorization helpers
- `lib/supabase/` for Supabase clients and session helpers
- `lib/prisma/` for Prisma client setup
- `lib/validations/` for Zod schemas
- `config/` for institution and feature flags
- `prisma/` for schema and migrations
- `docs/` for product and architecture specifications

## 7. Operational Recommendations

### 7.1 Environments

Use explicit environment variables for:
- `NEXT_PUBLIC_APP_URL`
- Supabase URL and keys
- database connection string
- any institution-specific branding or feature flags

### 7.2 Build and deployment

Recommended build flow:
- generate Prisma client before build
- run lint in CI
- keep deployment on Vercel or an equivalent Next.js-compatible platform
- ensure server runtime assumptions match Bun/Node compatibility for the deployment target

### 7.3 Error handling

For production stability:
- use route-level `error.tsx` and `not-found.tsx` where needed
- surface user-friendly Indonesian messages
- log server errors without exposing sensitive details to users

## 8. Architecture Summary

The current project already reflects a good App Router LMS architecture: server-rendered dashboards, role-based route protection, and a monolithic Next.js app with Supabase and Prisma.

The main improvements to keep applying are:
- consolidate authorization logic,
- reduce unnecessary client-side code,
- keep server actions and data helpers clearly separated,
- validate on the server,
- and keep branding/configuration fully externalized.

## 9. Notes for Future Growth

When the project grows into more advanced tiers, keep these principles:
- add new features modularly
- introduce API routes only when external integration needs them
- preserve role boundaries across every new page
- keep the `docs/` roadmap and the actual codebase synchronized
- revisit architecture whenever a feature introduces repeated logic or duplicated checks

