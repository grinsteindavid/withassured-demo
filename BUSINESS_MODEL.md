# Assured — Business Model

> Companion document to `README.md`. Explains what Assured (withassured.com) does, how it makes money, and how this dashboard scaffold maps to their business.

## One-liner

Assured is an **AI-powered operations platform for healthcare provider networks** — credentialing, licensing, payer enrollment, and continuous compliance monitoring — sold to organizations that need to get clinicians billing revenue as fast as possible.

## Who they serve

| Segment | Pain it solves |
|---|---|
| **Digital health companies** | Scaling provider networks fast without a credentialing team. |
| **Provider groups** (primary care, specialty, surgical) | Faster time-to-revenue per new clinician. |
| **Health systems** | Reducing multi-state licensing and roster admin overhead. |
| **Health plans / payers** | Delegated credentialing, roster ingestion, network compliance. |

## Core products

1. **Credentialing** — End-to-end primary-source verification (PSV) across 1,000+ sources. 2 days vs industry-standard 60+.
2. **Licensing** — Multi-state license applications, tracking, auto-renewals across all 50 states.
3. **Payer Enrollment** — Automated submissions to any payer in any state, with follow-up tracking. ~30% faster in-network.
4. **Network Management** — Continuous monitoring across 2,000+ sources; sanctions and expiration alerts.

Each product is a long-running **workflow** (hence Temporal.io): days-to-weeks, many async steps, retries, human approvals, external portal submissions.

## Revenue model

**B2B SaaS, enterprise contracts**, almost certainly a hybrid of:

- **Platform subscription** — annual contract tiered by provider count / org size / modules enabled.
- **Per-action / metered fees** — per credentialing file, per license application, per payer enrollment submission, per monitored provider per month.
- **Implementation / onboarding fees** for large health systems.

Their public ROI claims ($4,200–$5,800 saved per provider/yr, $7,200 revenue recaptured via earlier sanction detection, $10,122/day revenue enabled) are the anchor for value-based enterprise pricing.

**Why they can charge premium:**
- **NCQA CVO certification** — regulatory prerequisite for delegated credentialing contracts with payers. Few competitors have it.
- **Primary-source integration breadth** — 2,000+ sources is a moat built over time.
- **Workflow automation** — Temporal-backed pipelines reduce their own COGS, expanding margin.

## Competitive landscape

Assured positions itself against:

- **Medallion**, **Verifiable**, **CertifyOS** — modern API-first credentialing startups.
- **Andros** — network management / CVO.
- **Symplr**, **HealthStream**, **MD-Staff** — legacy incumbents.

The withassured.com site has dedicated `/alternative/<competitor>` landing pages for each, indicating SEO-driven competitive takeout is a sales motion.

## Moats

- NCQA CVO certification.
- Depth and breadth of primary-source integrations.
- Workflow orchestration (Temporal) reducing per-transaction cost.
- Data network effects: more providers monitored → better anomaly detection → better SLA claims.
- Founding story: built by Dawn Health operators who lived the pain.

## How this dashboard maps to the business

| Dashboard page | Product line | Revenue mechanic |
|---|---|---|
| Provider Credentialing Status | Credentialing | Per-file fee + subscription |
| License Management | Licensing | Per-application + renewal fee |
| Payer Enrollment Tracking | Payer Enrollment | Per-submission fee |
| Compliance Monitoring | Network Management | Per-provider-per-month monitoring fee |
| Provider Roster | Cross-cutting | Seat / provider-count subscription tier |
| Billing (mocked) | Cross-cutting | Surfaces usage-based charges back to the customer |

The billing page in this scaffold is intentionally designed to make the **metered revenue model visible** — each completed workflow generates a `UsageEvent`, which rolls up into an invoice. This mirrors how a real Series-A healthcare infra company would expose spend to its enterprise customers (and, internally, how finance would reconcile revenue).

## Productization notes (out of scope here)

- Real Stripe metered-billing integration.
- Contract-level pricing overrides (enterprise discounts, minimums).
- Usage-based alerts (e.g., "you're 80% through your monthly credentialing quota").
- Customer-facing admin for seat management and SSO.
