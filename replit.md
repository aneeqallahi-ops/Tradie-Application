# TradeLedger — Australian Sole Trader Business Management App

## Project Overview
A full-stack mobile-first web application for Australian sole trader tradies (plumbers, electricians, carpenters). Manages quotes, jobs, invoices, expenses, and tax compliance.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/tradeledger-v2/` — React + Vite frontend (port 5000 in dev)
- `artifacts/api-server/` — Express.js REST API backend (port 8080)
- `artifacts/mockup-sandbox/` — Mockup/design sandbox
- `lib/db/` — Drizzle ORM PostgreSQL schema + client
- `lib/api-spec/` — OpenAPI 3.0 specification
- `lib/api-client-react/` — Auto-generated Orval React Query hooks
- `lib/api-zod/` — Auto-generated Zod validation schemas
- `lib/replit-auth-web/` — Replit OIDC auth web client helper

### Tech Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, shadcn/ui (Radix), Wouter routing, TanStack Query, Framer Motion
- **Backend**: Express.js 5, Drizzle ORM, PostgreSQL, Pino logging, openid-client
- **Language**: TypeScript throughout
- **Package Manager**: pnpm (workspace monorepo)
- **Node.js**: v24

### Authentication
- Replit Auth via OpenID Connect (PKCE flow)
- Session-based with PostgreSQL session store
- Auth routes: `/api/login`, `/api/callback`, `/api/logout`
- Auth check: `/api/auth/user`

### Database (PostgreSQL via Drizzle ORM)
Tables in `lib/db/src/schema/`:
- `users` + `sessions` — Replit Auth (auth.ts)
- `tradie_users` — Business profile, settings, tax preferences (incl. `annual_turnover_band` for ATO benchmarking)
- `clients` — Customer records
- `quotes` + `quote_line_items` — Quote management with SOPA compliance
- `jobs` — Job tracking linked to quotes
- `invoices` — Invoice management with SOPA text
- `expenses` — Expense tracking with GST
- `vehicle_trips` — ATO 12-week logbook method
- `subcontractors` + `subcontractor_payments` — TPAR reporting
- `notifications` — In-app notifications
- `advisory_requests` — Tax advisory marketplace requests (Module 5, schema only so far)
- `tax_audit_log` — ATO compliance audit trail of every tax calculation served to a user

## Key Features

### Australian Tax Compliance
- GST: ÷11 method (not ×0.10)
- Legacy WYAK card uses 2024-25 brackets (`calculations.ts` — kept stable)
- New Tax Intelligence layer uses FY2025-26 brackets sourced from `/data/ato_tax_guidelines.json` (single source of truth — never hardcoded)
- LITO + Medicare levy 2% (with phase-in)
- BAS quarters with exact due dates
- ATO travel rate: $0.88/km
- Financial year: 1 Jul–30 Jun
- TPAR: Subcontractor payment tracking, due 28 August

### Tax Intelligence & Compliance Layer
- Reference data lives at project root: `/data/ato_tax_guidelines.json` and `/data/ato_benchmarks.json`. Loaded once at startup by `artifacts/api-server/src/lib/taxDataService.ts` — no module reads JSON directly.
- Every user-facing tax calculation writes to `tax_audit_log` (best-effort; failures don't block the response).
- Module 1 ✅: `GET /api/tax/position` → owed-today, EOFY projection, weekly set-aside, traffic light. Surfaced in dashboard `TaxPositionCard`.
- Module 2 ✅: `GET /api/tax/benchmarks` → ATO industry benchmark ratios vs user actuals. Surfaced in `/tax` Benchmarks tab.
- Module 3 ✅: `GET /api/tax/prompts` + `POST /tax/prompts/:key/dismiss` → trade-specific deductible categories with missed-deduction detection. Surfaced in `/tax` Deductions tab.
- Module 4 ✅: `GET /api/tax/strategies` → Strategy Engine. Assembles full UserContext, runs 8 strategy definitions, ranks by estimated dollar saving, logs to `tax_audit_log`. Strategy definitions: `instant_asset_writeoff`, `vehicle_logbook`, `super_contributions`, `prepay_expenses`, `home_office`, `review_benchmarks`, `gst_threshold`, `payg_instalment`. Surfaced in `/tax` Strategies tab (default tab) with dark summary banner, collapsible strategy cards, ATO reference links, and "Talk to your CPA" buttons linking to `/advisory/new?strategy=STRATEGY_ID`.
- Module 5 (advisory marketplace) — pending Task #5.

### Tax Strategy Engine (Module 4) Key Files
- `artifacts/api-server/src/lib/taxStrategies.ts` — 8 strategy definitions with `isApplicable(ctx)` + `calculateSaving(ctx)` + dynamic description
- `artifacts/api-server/src/routes/tax.ts` — `GET /api/tax/strategies` route handler
- `artifacts/tradeledger-v2/src/pages/tax/strategies.tsx` — Strategies tab UI
- `artifacts/tradeledger-v2/src/pages/tax/index.tsx` — 3-tab layout (Strategies default, Benchmarks, Deductions)

### Document Numbering
- Quotes: Q-YYYY-0001 (sequential, 4-digit padded, yearly)
- Invoices: INV-YYYY-0001
- Jobs: JOB-YYYY-0001

### SOPA Compliance
- State-specific Security of Payment Act text on all quotes/invoices
- Deposit limits enforced by state (VIC, NSW, QLD differ from others)

### "What You Actually Keep" (WYAK)
- Real-time financial summary in a bottom sheet
- Shows: revenue, GST collected, expenses, vehicle deduction, taxable income, estimated tax, net keep

### "What You'll Owe" (Tax Position card)
- New dashboard card next to WYAK; reads `GET /api/tax/position`
- Traffic-light indicator (green/amber/red/grey) + weekly set-aside + EOFY projection
- Drawer with bracket breakdown, Medicare, LITO and EOFY projection details

## Design System
- Background: `#F2EDE8` (warm cream)
- Primary: `#1A1A1A` (near-black)
- Accent: `#E8610A` (orange — only for active nav, urgent alerts)
- Cards: white, border-radius 16px
- Typography: Inter/system-ui
- Mobile-first: 390px primary viewport, 48px tap targets, 64px bottom nav

## Frontend Pages (wouter routing)
- `/` — Dashboard (stats, WYAK, BAS countdown, recent jobs)
- `/quotes` — Quote list + new quote form
- `/quotes/:id` — Quote detail
- `/jobs` — Job list
- `/jobs/:id` — Job detail with costs/invoices tabs
- `/invoices` — Invoice list
- `/expenses` — Expense list + capture
- `/logbook` — Vehicle logbook (ATO 12-week method)
- `/settings` — Business settings
- `/subcontractors` — TPAR subcontractor register
- `/notifications` — Notification list

## API Routes (all under `/api/`)
- `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- `GET/POST /quotes`, `GET/PUT /quotes/:id`, `POST /quotes/:id/send`, `POST /quotes/:id/convert`
- `GET/POST /jobs`, `GET/PUT /jobs/:id`, `PATCH /jobs/:id/status`
- `GET/POST /invoices`, `GET /invoices/:id`, `POST /invoices/:id/pay`, `POST /invoices/:id/reminder`
- `GET/POST /expenses`, `GET/PUT/DELETE /expenses/:id`, `GET /expenses/summary`
- `GET /logbook`, `POST /logbook/setup`, `GET/POST /logbook/trips`, `DELETE /logbook/trips/:id`, `GET /logbook/summary`
- `GET/POST /subcontractors`, `PUT /subcontractors/:id`, `GET /subcontractors/tpar-summary`
- `GET/PUT /settings`
- `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read`
- `GET /me`, `POST /me/onboard`
- `GET /dashboard`

## Workflows
- **Start application** — Frontend Vite dev server: `PORT=5000 pnpm --filter @workspace/tradeledger-v2 run dev` (port 5000, webview)
- **API Server** — Express backend: `PORT=8080 pnpm --filter @workspace/api-server run start` (port 8080, console)

## Deployment Architecture
In production, a single service handles everything:
- **Build**: `pnpm --filter @workspace/tradeledger-v2 run build && pnpm --filter @workspace/api-server run build`
- **Run**: `node --enable-source-maps artifacts/api-server/dist/index.mjs` (PORT=8080, NODE_ENV=production)
- The Express API server serves static frontend files from `artifacts/tradeledger-v2/dist/public/` in production mode
- All routes (`/`) handled by the API server artifact (`artifacts/api-server/.replit-artifact/artifact.toml`)
- The tradeledger-v2 artifact has no production section (dev preview only) to avoid multi-service port conflicts
- Health check: `GET /api/healthz`

## Development Commands
```bash
pnpm install           # Install all dependencies
# DB schema push
cd lib/db && pnpm run push
# API server build
pnpm --filter @workspace/api-server run build
# Frontend dev
PORT=5000 pnpm --filter @workspace/tradeledger-v2 run dev
# API codegen (after changing openapi.yaml)
cd lib/api-spec && pnpm run codegen
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `REPL_ID` — Replit App ID (auto-set by Replit, required for OIDC)
- `SESSION_SECRET` — Session signing secret (set in Replit Secrets)
- `REPLIT_DOMAINS` — Replit domains (auto-set)
- `REPLIT_DEV_DOMAIN` — Dev domain (auto-set)
