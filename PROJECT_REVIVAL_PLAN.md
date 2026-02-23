# Smart Street Revival Plan (2026)

## Product intent (inferred)
Smart Street is intended to be a two-sided B2B sourcing operating system for Indian street-food vendors and suppliers, with trust, affordability, and speed as the core value pillars.

## Current status
- Test health: stable (`220/220` Vitest tests passing).
- Build health: stable (`npm run build` passes).
- Core journeys present: discovery, recommendations, group ordering, order flow, tracking, analytics, voice queries.
- Technical maturity: strong feature breadth, but uneven consistency from hackathon-era rapid shipping.

## What was fixed in this recovery phase
- Stabilized integration and error-handling test suites.
- Added guest-mode resilience for workflow rendering.
- Hardened security input sanitization and error reporting flows.
- Upgraded supplier discovery UX with comparison and market insights.
- Added smart shortlist recommendations and CSV comparison export.

## Priority roadmap

### P0 (now)
- Unify auth architecture docs vs implementation (README still says Clerk while runtime uses app context auth).
- Remove duplicate/fallback logic by formally deciding which backend paths are canonical (`orders` vs `orderTracking` patterns).
- Add smoke E2E coverage for vendor/supplier happy paths on every PR.

### P1 (next)
- Supplier reliability engine:
  - Delivery SLA adherence score.
  - Dispute/cancellation rates.
  - Recency-weighted performance.
- Procurement playbooks:
  - “Low budget”, “risk resilient”, “quality first” profiles persisted per vendor.
  - Auto-generated monthly sourcing plan with reorder reminders.
- Observability:
  - Structured client error taxonomy.
  - Dashboard for top failing user flows and slow interactions.

### P2 (after)
- Contract and quotation workflows (RFQ to negotiated pricing).
- Logistics integrations for live shipment updates.
- ESG/compliance overlays for supplier filtering and reporting.

## Why these priorities
Recent procurement research highlights resilience, risk visibility, and AI-enabled sourcing as primary procurement priorities in 2025 and beyond. This aligns directly with Smart Street’s opportunity to become a decision engine, not only a listing marketplace.

