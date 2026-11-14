# Smart Street

**A sourcing platform for India's street food economy.** Smart Street connects street food vendors with
verified raw-material suppliers: vendors discover and compare suppliers, place individual or group orders and
track costs, while suppliers manage inventory, fulfil orders, verify their FSSAI licence and get demand
forecasts.

Built with React 19, TypeScript and Vite on the frontend and [Convex](https://convex.dev) as the real-time
backend and database.

> Originally built for the Tutedude Web Development Hackathon 1.0 ("Solving for Street Food").

---

## Features

### For vendors

- **Supplier discovery** — search and filter suppliers by location, category, price, rating and FSSAI status.
- **Recommendations** — suppliers ranked by a weighted score of distance, trust, category match, price and
  stock availability (`convex/recommendations.ts`).
- **Voice queries** — speak a request in English or one of 10 Indian languages; speech is transcribed with
  Sarvam AI and turned into search filters with an LLM via OpenRouter, with a rule-based fallback.
- **Orders & tracking** — place orders, follow status updates and delivery tracking in real time.
- **Group orders** — pool demand with nearby vendors for bulk pricing; expired/locked groups are handled by
  scheduled jobs.
- **Business tools** — financial analytics, recipe costing calculator, procurement planner, negotiation hub
  and market intelligence notes.

### For suppliers

- **Inventory management** — add products, edit price/stock/minimum order, toggle availability.
- **Order management** — accept and progress orders, add tracking updates.
- **AI demand forecasting** — 7-day demand forecasts per product that factor in order history and Indian
  seasonality/festivals. Runs daily via a Convex cron and on demand; falls back to a deterministic
  seasonal model when no AI key is configured.
- **FSSAI licence verification** — upload a certificate image; text is extracted with OCR.space, fields are
  parsed by an LLM and checked against the supplier profile (licence format, name similarity, expiry).
- **Trust score** — a 0–5 score built from ratings, completed orders, on-time delivery, certification and
  verification.
- **Analytics, smart pricing and automation** dashboards.

### Platform

- Email/password accounts with a vendor or supplier role; passwords are stored as salted PBKDF2-SHA256 hashes.
- Installable PWA with offline detection.
- Page-level Google Translate widget for regional languages.

> Some supplier tabs (Quality Control, Loyalty Program) currently display illustrative sample data and are
> not yet backed by Convex tables.

## Tech stack

| Layer        | Technology                                                           |
| ------------ | -------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 7, React Router 7, Tailwind CSS, Recharts |
| Backend / DB | Convex (queries, mutations, actions, cron jobs)                      |
| AI services  | OpenRouter (LLMs), Sarvam AI (speech-to-text), OCR.space             |
| Testing      | Vitest + Testing Library + MSW (unit/integration), Playwright (e2e)  |
| Tooling      | ESLint (typescript-eslint), Prettier, GitHub Actions                 |
| Deployment   | Static hosting (Vercel/Netlify) or Docker + nginx; Convex Cloud      |

## Architecture

```
┌──────────────────────────────┐          ┌────────────────────────────────────┐
│ React SPA (Vite, PWA)        │  WebSocket│ Convex deployment                  │
│  pages/  Vendor & Supplier   │◀────────▶│  queries / mutations  (database)   │
│          dashboards          │  (sync)  │  actions  ──► OpenRouter, OCR.space│
│  contexts/AuthContext        │          │  crons    ──► forecasts, group     │
│  services/ voice + vision ───┼──► Sarvam AI, OpenRouter (browser calls)       │
└──────────────────────────────┘          └────────────────────────────────────┘
```

- **Reactive data**: components subscribe with `useQuery`, so lists and dashboards update live.
- **Network calls happen in actions**: Convex queries/mutations are deterministic and cannot call external
  APIs, so AI forecasting and FSSAI verification run as actions that read data through internal queries and
  write through internal mutations (`convex/suppliers.ts`, `convex/fssaiVerification.ts`).
- **Pure domain logic** lives in `convex/lib/` (forecasting, FSSAI checks, trust score, password hashing,
  OpenRouter client) and is unit-tested in isolation.
- **Server secrets** (`OPENROUTER_API_KEY`, `OCR_SPACE_API_KEY`) are Convex environment variables and never
  reach the browser.

## Getting started

### Prerequisites

- Node.js 20+ (CI uses Node 22) and npm
- A free [Convex](https://convex.dev) account for your own backend

### 1. Install

```bash
git clone https://github.com/jeevithg090/Smart-Vendors-Suppliers.git
cd Smart-Vendors-Suppliers
npm ci
```

### 2. Start the Convex backend

```bash
npx convex dev
```

On first run this asks you to log in, creates a deployment, pushes the schema and functions, regenerates
`convex/_generated/` and writes `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to `.env.local`. Keep it running
while you develop.

Optional — seed demo data (internal functions, run from the CLI):

```bash
npx convex run sampleData:addSampleSuppliers
npx convex run sampleData:addSampleVendor
```

### 3. Configure environment variables

```bash
cp .env.example .env.local   # then fill in the values you need
```

Set server-side secrets on the Convex deployment (not in `.env.local`):

```bash
npx convex env set OPENROUTER_API_KEY <your-key>   # AI forecasts + FSSAI analysis
npx convex env set OCR_SPACE_API_KEY <your-key>    # FSSAI certificate OCR
```

### 4. Run the app

```bash
npm run dev        # http://localhost:5173
```

If `VITE_CONVEX_URL` is not set, the client falls back to the public demo backend URL defined in
`src/main.tsx`. In development builds only, if the backend is unreachable the app starts an offline demo
session so the UI can still be explored.

## Environment variables

Frontend variables are read by Vite at build time. **Every `VITE_*` value is embedded in the JavaScript
bundle and is public** — use keys restricted to your domain.

| Variable                                                  | Where        | Required | Purpose                                  |
| --------------------------------------------------------- | ------------ | -------- | ---------------------------------------- |
| `VITE_CONVEX_URL`                                         | `.env.local` | Yes\*    | Convex deployment URL                    |
| `CONVEX_DEPLOYMENT`                                       | `.env.local` | Dev      | Written by `npx convex dev`              |
| `VITE_SARVAM_API_KEY`                                     | `.env.local` | Voice    | Speech-to-text for voice queries         |
| `VITE_OPENROUTER_API_KEY`                                 | `.env.local` | Voice    | LLM parsing of voice queries/filters     |
| `VITE_GOOGLE_TRANSLATE_API_KEY`                           | `.env.local` | No       | Translation fallback                     |
| `VITE_VISION_API_KEY`, `VITE_CLARIFAI_API_KEY`            | `.env.local` | No       | Ingredient photo recognition             |
| `VITE_AZURE_VISION_API_KEY`, `VITE_AZURE_VISION_ENDPOINT` | `.env.local` | No       | Alternative vision provider              |
| `VITE_TTS_API_KEY`                                        | `.env.local` | No       | Text-to-speech (placeholder integration) |
| `OPENROUTER_API_KEY`                                      | Convex env   | No\*\*   | AI demand forecasts, FSSAI field parsing |
| `OCR_SPACE_API_KEY`                                       | Convex env   | FSSAI    | OCR for FSSAI certificate uploads        |
| `CONVEX_DEPLOY_KEY`                                       | CI secret    | Deploy   | Non-interactive `npx convex deploy`      |

\* Falls back to the demo backend if unset. \*\* Without it, forecasts use the deterministic seasonal model.

## Scripts

| Command                  | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Start the Vite dev server                               |
| `npm run dev:backend`    | Start `convex dev` (push functions, watch for changes)  |
| `npm run build`          | Type-check and build the production bundle to `dist/`   |
| `npm run preview`        | Serve the production build locally                      |
| `npm run lint`           | ESLint                                                  |
| `npm run format`         | Format with Prettier (`format:check` to verify)         |
| `npm run typecheck`      | Type-check the app and the Convex functions             |
| `npm test`               | Run unit and integration tests (Vitest)                 |
| `npm run test:coverage`  | Tests with V8 coverage                                  |
| `npm run test:e2e`       | Playwright end-to-end tests (needs a reachable backend) |
| `npm run test:api`       | Smoke-test a live Convex deployment's public API        |
| `npm run deploy:backend` | Deploy Convex functions (`npx convex deploy`)           |

## Testing

- **Unit / integration** (`src/test/`): domain logic in `convex/lib` (forecasting, FSSAI verification,
  trust score, password hashing, OpenRouter fallback), validation, retry and error-handling utilities, voice
  processing and React components. All network calls are mocked; no API keys are needed.
- **End-to-end** (`e2e/`): Playwright flows for sign-up, role routing, offline handling and core vendor and
  supplier journeys. They start the dev server automatically and require a Convex backend running the
  functions in this repo. To use an already-installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

CI (`.github/workflows/ci.yml`) runs lint, format check, type-check, unit tests, the production build and a
production dependency audit on every push to `main` and every pull request.

## Deployment

1. **Backend** — deploy the Convex functions and set the server environment variables:

   ```bash
   npx convex deploy               # or CONVEX_DEPLOY_KEY=... npx convex deploy in CI
   npx convex env set OPENROUTER_API_KEY <key> --prod
   npx convex env set OCR_SPACE_API_KEY <key> --prod
   ```

2. **Frontend** — any static host works. Build with `VITE_CONVEX_URL` pointing at the production deployment.
   - **Vercel**: `vercel.json` configures the build, SPA rewrites, caching and security headers (CSP allows
     Convex and the AI APIs used by the client).
   - **Docker**: builds the app and serves it with nginx as a non-root user on port 8080.

     ```bash
     docker build --build-arg VITE_CONVEX_URL=https://<deployment>.convex.cloud -t smart-street .
     docker run -p 8080:8080 smart-street   # health check at /health
     ```

## Project structure

```
├── convex/                 # Backend: schema, queries, mutations, actions, crons
│   ├── lib/                # Pure, unit-tested domain logic (forecasting, fssai, trustScore, password, …)
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Email/password sign-up and login
│   ├── suppliers.ts        # Supplier profiles, search, AI forecasting actions
│   ├── fssaiVerification.ts# FSSAI certificate verification action
│   ├── crons.ts            # Scheduled jobs
│   └── _generated/         # Generated by `npx convex dev` (do not edit)
├── src/
│   ├── pages/              # Home, VendorDashboard, SupplierDashboard
│   ├── components/         # Feature components (orders, group orders, voice, analytics, …)
│   ├── contexts/           # AuthContext (session + login/signup)
│   ├── services/           # AI service clients, error reporting, performance monitoring
│   ├── utils/ hooks/       # Validation, retry/timeout, voice processing, form hooks
│   ├── config/             # Feature configuration
│   └── test/               # Vitest suites
├── e2e/                    # Playwright specs
├── deploy/                 # nginx config and shared security headers for Docker
├── docs/                   # Additional documentation
├── Dockerfile
└── vercel.json
```

## Security notes

- Authentication is a lightweight email/password scheme implemented in Convex. Sessions are kept in the
  browser and Convex functions receive the user's email or profile id as arguments; they do not yet verify a
  server-issued token. Moving to [Convex Auth](https://labs.convex.dev/auth) (or another identity provider) is
  the recommended next step before handling real user data.
- Keys prefixed with `VITE_` are visible to anyone who loads the site. Proxy those calls through Convex
  actions if a provider's key must stay private.

## Further reading

- [docs/error-handling.md](docs/error-handling.md) — error handling utilities and patterns used in the UI.
