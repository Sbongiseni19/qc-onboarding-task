# QC Onboarding Task — Application Portal

A two-page web application for tracking university and college applications, built as the QueryCrest Full-Stack Web Developer onboarding task. Users can sign up, log in, and manage a personal list of applications (institution, course, academic year, and status), all backed by Supabase Auth and Deno Edge Functions.

## Architecture Overview

This project follows a strict separation of concerns:

- **Frontend (`index.html`, `dashboard.html`, `style.css`, `auth.js`, `dashboard.js`)** — handles presentation only. It reads form input, sends requests to the edge functions, and renders the responses. It never talks to the database directly and never contains any Supabase keys or business logic.

- **Edge Functions (`supabase/functions/`)** — all business logic, validation, and database access live here, running on Supabase's Deno runtime.
  - `auth-handler` — handles `signup` and `login`. Validates input, creates users via Supabase Auth, manages a custom rate-limiting/lockout system (3 failed attempts → 10-minute lockout → 1-hour lockout on repeat), and returns a JWT session token on successful login.
  - `applications-handler` — handles `add` and `load`. Verifies the caller's JWT on every request, validates the institution against an approved list, and reads/writes the `applications` table scoped to the authenticated user.

- **Database (Supabase Postgres)** — four tables: `profiles`, `applications`, `login_attempts`, and `account_lockouts`. Row Level Security is enabled on all four with no policies defined, meaning only the service role (used exclusively inside edge functions) can read or write — the frontend and anonymous requests have zero direct database access.

**Request flow:**

```
Browser (index.html / dashboard.html)
   │  fetch() with JSON body (+ JWT for applications-handler)
   ▼
Edge Function (auth-handler / applications-handler)
   │  validates input, checks/enforces rate limits, verifies JWT
   ▼
Supabase (Auth + Postgres, via service role key)
```

## Project URL

```
https://jecvbcdiytxgtvqibdby.supabase.co
```

(No keys are included here — see Supabase Dashboard → Settings → API for credentials, which are stored only as Edge Function secrets.)

## Setup Instructions

### Prerequisites

- A Supabase account (free tier)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- A modern web browser

### 1. Clone the repository

```bash
git clone https://github.com/Sbongiseni19/qc-onboarding-task.git
cd qc-onboarding-task
```

### 2. Create the database tables

In the Supabase SQL Editor, run the four `CREATE TABLE` statements for `profiles`, `applications`, `login_attempts`, and `account_lockouts`, then enable Row Level Security on all four tables.

### 3. Add Edge Function secrets

In **Edge Functions → Secrets**, no manual `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` secrets are needed — these are provided automatically by the Supabase runtime. Add any additional secrets your setup requires (e.g. `ANON_KEY`, `JWT_SECRET`) under **Edge Functions → Secrets**.

### 4. Link and deploy the Edge Functions

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy auth-handler --no-verify-jwt
supabase functions deploy applications-handler
```

`auth-handler` is deployed with `--no-verify-jwt` so the browser can call `signup`/`login` without needing any Supabase key in its JavaScript — the function's own logic (CORS, rate limiting) handles security. `applications-handler` keeps platform JWT verification on, since every request must carry a real user session token.

### 5. Run the frontend

No build step is required — open `index.html` directly in a browser, or serve the folder with any static file server.

## Features

- Sign up and log in with email/password (Supabase Auth)
- Custom rate limiting: 3 failed login attempts → 10-minute lockout → 1-hour lockout on repeated failures
- Session persisted via JWT in `sessionStorage`, with an immediate redirect guard on the dashboard for unauthenticated visits
- Add and view applications, scoped per user, with institution validated against an approved list of South African universities and colleges
- Draft vs. Submitted status shown as a visual seal badge
- Responsive layout down to mobile widths

## Screenshots

_Add screenshots of both pages working here before submitting:_

**index.html — Login / Sign Up**

_(screenshot placeholder)_

**dashboard.html — Application Ledger**

_(screenshot placeholder)_

## Tech Stack

HTML · CSS · Vanilla JavaScript · Supabase (Auth + Postgres) · Deno Edge Functions

---

## Submission

Submitted via the `submit/sbongiseni` branch, per the onboarding task instructions.

© 2026 QueryCrest (Pty) Ltd
