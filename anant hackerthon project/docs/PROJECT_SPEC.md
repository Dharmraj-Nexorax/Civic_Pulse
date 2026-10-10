# CIVICPULSE — BUILD SPECIFICATION FOR AI CODING AGENTS

> **Tagline:** From Complaint to Resolution
> **Use:** Paste this whole file into Antigravity / Cursor / Codex / any coding agent, or save it as `docs/PROJECT_SPEC.md` in an empty repo and tell the agent: *"Read docs/PROJECT_SPEC.md fully, then execute Section 14 phase by phase."*

---

## 0. RULES FOR THE AGENT (READ FIRST — THESE OVERRIDE YOUR DEFAULTS)

1. **Build exactly what this document defines. Do not add features, pages, fields, tables, metrics or claims that are not in it.** If you think something is missing, write it to `docs/QUESTIONS.md` and continue with the documented default.
2. **Evidence labels.** Every rule below carries a label:
   - **[SRC]** — stated in the product owner's original CivicPulse document (PPT-derived context).
   - **[PROP]** — designed by the product owner in the same document but explicitly marked as *proposed* (not in the PPT). Build it; never describe it as a PPT feature in UI copy or docs.
   - **[DEC]** — an implementation decision made in *this* spec because the source is silent. Build it as written. Record every [DEC] you rely on in `docs/DECISIONS.md`. Changeable by the owner.
   - **[OPEN]** — unresolved question. Use the stated default and list it in `docs/QUESTIONS.md`.
3. **No fabricated data or claims.** No hard-coded statistics, accuracy percentages, "AI is 94% accurate", testimonials, or performance-improvement claims anywhere in code or UI. Every number shown must come from the database or a documented formula. Demo/seed data must be flagged `is_demo = true` and labelled "Demo data" wherever shown.
4. **Core system must work with the AI service stopped.** [SRC] AI only *suggests*; rules and the workflow engine decide. If the AI service is down or times out, every user flow still completes using the documented fallback. Verify this (Section 15, test T-AI-DOWN).
5. **Never invent library APIs.** Use only the dependencies and versions listed in Section 4. If you are unsure of an API, read the installed package's types/docs in `node_modules` / `site-packages` instead of guessing. Do not add dependencies that are not listed without recording why in `docs/DECISIONS.md`.
6. **Parameterized SQL only.** No string-concatenated SQL. No ORM (plain `pg`).
7. **Every state change goes through the single state-machine module** (Section 6). No route handler may write `issues.status` directly.
8. **Definition of done for every phase:** it runs, the listed acceptance tests pass, and nothing from a later phase is stubbed with fake data.
9. **Placeholder numbers.** Several thresholds (SLA hours, similarity radius, etc.) have no basis in the source. They are marked **PLACEHOLDER**, live in configuration (not scattered in code), and must be shown to the owner in `docs/DECISIONS.md` as "needs owner confirmation".

---

## 1. PRODUCT BRIEF (CONDENSED) [SRC]

**CivicPulse** is a civic accountability platform that converts citizen complaints into organized, prioritized and trackable workflows, ending with **citizen verification** of the actual resolution.

- **Core principle:** *Reporting ≠ Resolution.* An issue is **not closed** when staff mark it resolved. It stays open until the **citizen verifies the fix**.
- **Initial target:** Gram Panchayats and Nagar Panchayats. **Future (architecture must allow, nothing built now):** Municipalities, Campuses, Residential Communities.
- **Accountability loop:** REPORT → VERIFY → GROUP → PRIORITIZE → ASSIGN → RESOLVE → CITIZEN CONFIRM.
- **Differentiators (must all exist in the product):**
  1. **Community Signal** — many reports → one civic issue.
  2. **Transparent Priority** — rule-based, explainable score; no black box.
  3. **Civic Heatmap** — location → map → hotspots → insight.
  4. **Citizen Verification** — resolution → citizen confirmation → verified resolution.
- **Three panels + one public view:**
  - **Citizen:** Report → Track → Verify → Rate.
  - **Worker:** Receive → Accept/Start → Work → Update → Resolve. [PROP — Worker panel was added by the owner after the PPT]
  - **Administrator:** Monitor → Assign → Manage → Analyze → Improve.
  - **Community (public, no login):** Observe → Hotspots. Aggregated data only, never private/administrative data.
- **AI principle [SRC]:** *Rules decide, workflow executes, AI assists. Humans remain in control.*

### 1.1 Hard constraints from the source [SRC]
- Do not turn it into a generic complaint box. Preserve the lifecycle.
- Citizen verification is the only final closure mechanism.
- Keep citizen / worker / admin permissions separate.
- Duplicate reports may belong to one underlying issue.
- Prioritization must be explainable and rule-based.
- Preserve location-based insight (map, hotspots).
- Workflow is state-driven (state machine), not free-text status.
- AI is an assisting layer and never the sole authority.
- Do not claim accuracy/performance numbers without real data.
- Do not invent product features beyond the defined product.

---

## 2. STACK INTERPRETATION

The source says: *Frontend: React + Tailwind + CSS · Backend: Next.js · DB: SQL · AI: Python.*

**[DEC] Interpretation used here (four deployable parts, matching the "frontend / backend / db / AI folders" requirement):**

| Part | Folder | Technology |
|---|---|---|
| Frontend | `frontend/` | React 18 + TypeScript + Vite + Tailwind CSS 3.4 (+ plain CSS file for tokens) |
| Backend / API / business logic | `backend/` | Next.js 14.2.x (App Router) used **API-only** (Route Handlers under `src/app/api`) + TypeScript |
| Database | `database/` | PostgreSQL 15+ (SQL migrations + SQL seeds) |
| AI service | `ai-service/` | Python 3.11+ FastAPI microservice (stateless) |

The frontend talks **only** to the backend. The backend talks to Postgres and to the AI service. **The AI service never touches the database and never calls the frontend.**

---

## 3. MVP SCOPE (EXPLICIT)

Legend — **Source:** SRC / PROP / DEC. **Tier:** P0 = core loop (must work end-to-end first), P1 = panels & analytics, P2 = AI features, P3 = deferred (do **not** build now).

### 3.1 In scope

| # | Feature | Panel | Source | Tier |
|---|---|---|---|---|
| 1 | Register / login / logout, role-based access (citizen, worker, admin) | all | SRC (roles) | P0 |
| 2 | Report issue: category, description, media, location (+ward) | Citizen | SRC | P0 |
| 3 | Media upload (images/video, see §7 `media`) | Citizen, Worker | SRC | P0 |
| 4 | Complaint ID + status tracking + full timeline | Citizen | SRC | P0 |
| 5 | State machine: REPORTED→…→CITIZEN_VERIFIED (+ REOPENED loop) | system | SRC (+PROP reopen) | P0 |
| 6 | Automatic verification checks (soft flags) | system | SRC | P0 |
| 7 | Grouping: citizen "Join existing issue" + admin merge/detach | Citizen, Admin | SRC concept / PROP UI | P0 |
| 8 | Rule-based explainable priority (100-pt, 5 factors) + admin override with reason | system, Admin | SRC factors / PROP weights | P0 |
| 9 | Admin assignment to team + worker, assignment recommendation (rules) | Admin | SRC / PROP | P0 |
| 10 | Worker: my issues, details, map, start, note, resolve with proof | Worker | PROP | P0 |
| 11 | Citizen verification (fixed / not fixed → reopen) | Citizen | SRC | P0 |
| 12 | Citizen rating 1–5 after verification | Citizen | PROP | P0 |
| 13 | In-app notifications | all | DEC | P0 |
| 14 | Landing page + public community hotspot map | public | SRC / PROP | P1 |
| 15 | "Is this already reported?" (similar issues at report time) | Citizen | PROP | P1 |
| 16 | Nearby civic issues | Citizen | PROP | P1 |
| 17 | Citizen dashboard ("My Complaints") | Citizen | PROP | P1 |
| 18 | Worker dashboard, performance score + breakdown, history, trend | Worker | PROP | P1 |
| 19 | Admin dashboard, all issues, unassigned, overdue, reopened views | Admin | SRC/PROP | P1 |
| 20 | Worker management (create worker, list, workload, score) | Admin | PROP | P1 |
| 21 | Team performance + team comparison + workload distribution | Admin | PROP | P1 |
| 22 | Civic Intelligence: heatmap/hotspots by ward & category | Admin, public | SRC | P1 |
| 23 | Analytics & reports (metrics dictionary §8.9) | Admin | SRC/PROP | P1 |
| 24 | Rule-based performance alerts (not AI) | Admin | PROP | P1 |
| 25 | AI Complaint Assistant (category suggestion, structured description, missing info) | Citizen | SRC (categorize) / PROP | P2 |
| 26 | AI Similar-Issue Detector (embeddings; rules fallback) | Citizen, Admin | SRC | P2 |
| 27 | AI Summarization of long complaints | Admin, Worker | SRC | P2 |
| 28 | AI Status Assistant (explain status in plain language) | Citizen | PROP | P2 |
| 29 | AI Worker Copilot | Worker | PROP | P2 |
| 30 | AI Resolution Report draft (worker edits & confirms) | Worker | PROP | P2 |
| 31 | AI Admin Insights (summary + grounded Q&A over computed stats) | Admin | PROP | P2 |

### 3.2 Explicitly OUT of scope (P3 — do not build) [DEC]
Voice-to-work-update (needs speech-to-text; source gives no provider) · achievement badges · worker leaderboard · "team health" traffic-light view · OTP/mobile login · email/SMS/push notifications · public complaint lookup by ID · admin UI for editing settings · multi-organization UI (schema supports it; UI does not) · municipality/campus/community deployments · payments/pricing · any Hindi/regional UI translation (AI *input* may be Hindi/Hinglish; UI text is English) · spam/invalid-complaint rejection workflow (source defines none; see §16).

---

## 4. TECH STACK, VERSIONS, REPO LAYOUT, ENVIRONMENT

### 4.1 Pinned versions [DEC]
Pin these majors in `package.json` / `requirements.txt` (use the latest patch of the stated series). Do not upgrade majors during the build.

| Layer | Packages |
|---|---|
| Frontend | `react@18`, `react-dom@18`, `react-router-dom@6`, `vite@5`, `@vitejs/plugin-react`, `typescript@5`, `tailwindcss@3.4` + `postcss` + `autoprefixer`, `leaflet@1.9`, `react-leaflet@4` (v4 is the React-18 line), `@types/leaflet` |
| Backend | `next@14.2` (App Router, route handlers only), `react`/`react-dom@18` (Next peer deps only), `typescript@5`, `pg@8`, `zod@3`, `jose` (JWT), `bcryptjs`, `tsx` (run scripts) |
| AI service | Python ≥3.11, `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `httpx`, `numpy`, `sentence-transformers`, `pytest` |
| Database | PostgreSQL 15+ via `docker-compose.yml` (DB only) |

Notes:
- Next.js 14 route handler dynamic params are **synchronous** (`{ params }: { params: { id: string } }`). Do not use the Next 15 `await params` style.
- Tailwind **v3.4** with `tailwind.config.ts` + `postcss.config.js`. Do not use Tailwind v4 syntax (`@import "tailwindcss"`).
- Language: TypeScript for frontend and backend [DEC].

### 4.2 Ports [DEC]
Frontend `5173` · Backend `3001` · AI service `8001` · Postgres `5432`.
Vite dev server **proxies** `/api` → `http://localhost:3001` so the browser sees one origin and the httpOnly auth cookie works without CORS. In production, serve all behind one domain via a reverse proxy (document in README; do not build a proxy).

### 4.3 Repository layout (create exactly this)

```
civicpulse/
├── README.md                      # how to run all 4 parts, env, seed, tests
├── docker-compose.yml             # postgres only
├── .gitignore
├── docs/
│   ├── PROJECT_SPEC.md            # this file (verbatim copy)
│   ├── DECISIONS.md               # every [DEC]/PLACEHOLDER actually used
│   └── QUESTIONS.md               # every [OPEN] + anything ambiguous you hit
├── database/
│   ├── migrations/
│   │   ├── 001_extensions_enums.sql
│   │   ├── 002_core_tables.sql
│   │   ├── 003_workflow_tables.sql
│   │   └── 004_indexes.sql
│   └── seeds/
│       └── 001_base.sql           # org, wards, teams, categories, org_settings (NO users/passwords)
├── backend/
│   ├── package.json  tsconfig.json  next.config.mjs  .env.example
│   ├── scripts/
│   │   ├── migrate.ts             # applies database/migrations in order, tracks schema_migrations
│   │   ├── seed.ts                # runs database/seeds/*.sql + creates first admin from env
│   │   ├── seed-demo.ts           # OPTIONAL demo users/complaints, all is_demo=true
│   │   └── e2e-smoke.ts           # full lifecycle over HTTP (Section 15)
│   └── src/
│       ├── app/api/               # route handlers (Section 9), thin: parse → service → respond
│       ├── lib/                   # db.ts auth.ts errors.ts http.ts validate.ts config.ts geo.ts(Haversine) uploads.ts
│       ├── domain/                # PURE functions, no I/O, unit-tested
│       │   ├── stateMachine.ts
│       │   ├── priority.ts
│       │   ├── workerScore.ts
│       │   ├── teamScore.ts
│       │   ├── hotspots.ts
│       │   ├── alerts.ts
│       │   ├── recommendation.ts
│       │   ├── keywordCategorizer.ts   # backend fallback when AI service is down
│       │   └── templates.ts            # next_step_text, summary/report/copilot/insight templates
│       ├── services/              # DB-touching orchestration
│       │   ├── complaintService.ts  issueService.ts  assignmentService.ts
│       │   ├── resolutionService.ts metricsService.ts notificationService.ts
│       │   └── similarityService.ts
│       ├── integrations/aiClient.ts   # ONLY place that calls the AI service
│       └── tests/                 # vitest-free: use node:test + tsx for domain/*.ts
├── ai-service/
│   ├── requirements.txt  .env.example  README.md
│   ├── app/
│   │   ├── main.py  config.py  schemas.py  security.py
│   │   ├── routers/ categorize.py similar.py summarize.py status.py copilot.py report.py insights.py health.py
│   │   └── services/ embeddings.py keyword_fallback.py llm.py prompts.py
│   └── tests/
└── frontend/
    ├── package.json  tsconfig.json  vite.config.ts  tailwind.config.ts  postcss.config.js  index.html
    └── src/
        ├── main.tsx  App.tsx
        ├── styles/ tokens.css  index.css
        ├── api/ client.ts types.ts  (one function per endpoint in §9)
        ├── auth/ AuthContext.tsx  ProtectedRoute.tsx
        ├── components/ (see §11.4)
        └── pages/
            ├── public/    Landing  Login  Register  CommunityMap
            ├── citizen/   Dashboard  ReportIssue  MyComplaints  ComplaintDetail  NearbyIssues  Notifications
            ├── worker/    Dashboard  MyIssues  IssueDetail  Verification  Performance  History
            └── admin/     Dashboard  Issues  IssueDetail  Workers  WorkerDetail  Teams  TeamDetail  Intelligence  Analytics
```

### 4.4 Environment variables (each service ships `.env.example`; never commit real secrets)

**backend/.env**
```
DATABASE_URL=postgres://civicpulse:civicpulse@localhost:5432/civicpulse
JWT_SECRET=change-me-min-32-chars
COOKIE_NAME=cp_token
COOKIE_MAX_AGE_SECONDS=604800
UPLOAD_DIR=./uploads
MAX_IMAGE_MB=10            # PLACEHOLDER
MAX_VIDEO_MB=25            # PLACEHOLDER
MAX_FILES_PER_COMPLAINT=5  # PLACEHOLDER
AI_SERVICE_URL=http://localhost:8001
AI_INTERNAL_KEY=change-me-shared-secret
AI_TIMEOUT_MS=4000         # PLACEHOLDER
DEFAULT_ORGANIZATION_SLUG=demo-panchayat
SEED_ADMIN_NAME=Admin
SEED_ADMIN_MOBILE=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_CENTER_LAT=           # REQUIRED for seed (no default; spec does not invent a location)
SEED_CENTER_LNG=           # REQUIRED for seed
```
**ai-service/.env**
```
AI_INTERNAL_KEY=change-me-shared-secret     # must equal backend's
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
LLM_BASE_URL=        # OpenAI-compatible base URL (…/v1). Empty = LLM features use deterministic templates
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_SECONDS=20      # PLACEHOLDER
```
**frontend/.env** — none required (relative `/api` + Vite proxy).

> **[DEC] LLM provider is not specified in the source.** The AI service targets any **OpenAI-compatible `POST {LLM_BASE_URL}/chat/completions`** endpoint (many providers and local runtimes expose this). If `LLM_*` vars are empty, LLM-dependent endpoints return deterministic template output with `method: "template"` — the app is fully usable. Do not hard-wire a vendor SDK.

---

## 5. ROLES & PERMISSIONS [SRC for roles; DEC for details]

Auth model: **Login → Identity → Role → Permissions.** Sign-in by mobile number **or** email + password. JWT (HS256, `jose`) in an **httpOnly, SameSite=Lax** cookie. Passwords hashed with `bcryptjs` (cost 10). Registration creates **citizens only**. Workers are created by an admin. The first admin is created by `npm run seed` from env vars.

| Capability | Public | Citizen | Worker | Admin |
|---|:-:|:-:|:-:|:-:|
| View landing, aggregated hotspots, public stats | ✅ | ✅ | ✅ | ✅ |
| Create complaint, upload media | – | ✅ | – | – |
| View **own** complaints & their issue timeline | – | ✅ (own/joined) | – | – |
| Verify / reject resolution, rate | – | ✅ (**primary reporter** of the issue only) | – | – |
| View assigned issues (full details, media, map) | – | – | ✅ (**own assignments only**) | ✅ (all) |
| Start work, add note, resolve with proof | – | – | ✅ (own assignments) | ✅ resolve on behalf (reason required) |
| View all issues, assign/reassign, severity review, priority override, merge/detach | – | – | – | ✅ |
| Worker/team management & scores, analytics, alerts, AI insights | – | – | – | ✅ |
| View own performance score | – | – | ✅ (own only) | ✅ (all) |

Rules:
- Every query is scoped by `organization_id` of the authenticated user. [DEC — scalability]
- Workers can never see other workers' scores. Citizens see the **assigned team name only**, never the worker's identity **[DEC]**. Workers never see citizen identity or contact details **[DEC]**. (source example shows "Assigned: Water Team").
- The community/public endpoints return **aggregates only** — no complaint text, IDs, reporter data, media.
- Authorization is enforced in the backend on every route (`requireRole(...)`); hiding a menu item in the UI is not authorization.

---

## 6. DOMAIN MODEL & WORKFLOW STATE MACHINE

### 6.1 Concepts [SRC]
- **Complaint** = one citizen's report.
- **Issue** = a *community issue*; it holds the workflow state. **Many complaints → one issue** (Community Signal). A new complaint creates its own issue unless the citizen joins an existing one or an admin merges.
- Data relationship: `User → Complaint → Location / Category / Media → Issue(Status, Priority) → Assignment → Resolution → Confirmation(+Rating)`.

### 6.2 States
`REPORTED → VERIFICATION → GROUPED → PRIORITIZED → ASSIGNED → IN_PROGRESS → RESOLVED → CITIZEN_VERIFIED` [SRC]
plus `REOPENED` [PROP — from the worker/citizen flow: "Citizen rejects → Reopened → Worker receives issue again"].

UI display labels: `RESOLVED` is shown as **"Resolved — Awaiting Citizen Confirmation"** [SRC: "Resolved ≠ Final Closure"]. `CITIZEN_VERIFIED` is the **only** terminal/closed state.

### 6.3 Transition table (the ONLY legal transitions) — implement in `domain/stateMachine.ts`

| From | To | Actor | Preconditions | Side effects |
|---|---|---|---|---|
| *(none)* | REPORTED | citizen | valid payload (§9) | create complaint (+issue unless joining); event |
| REPORTED | VERIFICATION | system | automatic, same request | run verification checks (§8.2) |
| VERIFICATION | GROUPED | system | automatic | similarity evaluation → suggestions only (§8.3); event notes "standalone" or "N similar flagged" |
| GROUPED | PRIORITIZED | system | automatic | compute priority (§8.1); store breakdown |
| PRIORITIZED | ASSIGNED | admin | team active, worker active **and** `worker.team_id = team_id` | create `assignments` row; notify worker |
| ASSIGNED | IN_PROGRESS | assigned worker | caller is `assigned_worker_id` | set `started_at`; mark assignment `accepted_at` |
| IN_PROGRESS | RESOLVED | assigned worker **or** admin-on-behalf | worker: ≥1 proof media + non-empty note. admin: non-empty note + reason | create `resolutions` row (`citizen_decision='PENDING'`); notify primary reporter |
| RESOLVED | CITIZEN_VERIFIED | primary reporter | decision = verified | set `verified_at`; resolution decision `VERIFIED`; notify worker |
| RESOLVED | REOPENED | primary reporter | decision = not fixed + non-empty reason | resolution decision `REJECTED`; `reopened_count += 1`; notify worker + admin |
| REOPENED | IN_PROGRESS | assigned worker | caller is assigned worker | new work cycle; `started_at` updated |
| ASSIGNED / IN_PROGRESS / REOPENED | ASSIGNED | admin (reassign) | new team/worker valid; reason required | close old assignment (`ended_reason='REASSIGNED'`), create new; notify both workers |

Anything not in this table must throw `ILLEGAL_TRANSITION` (HTTP 409). Each transition writes one `issue_events` row **in the same DB transaction** as the state change. `PRIORITIZED` (and `GROUPED`, `VERIFICATION`) are reached automatically inside the submit request, so the citizen timeline shows all stages with timestamps. [DEC]

Constraints:
- **Verification authority [DEC/OPEN]:** only the **primary reporter** (the citizen of the issue's first complaint) can verify/reject. Joined reporters see status read-only. *Default stands until the owner decides otherwise.*
- **No auto-close.** There is no timeout that closes or verifies an issue. An unverified resolution stays `RESOLVED` ("Awaiting Citizen Confirmation") and is **not counted as the worker's failure** (§8.6). [SRC: "Don't automatically punish the worker"]
- Joining is allowed only while the target issue status ∈ {REPORTED…IN_PROGRESS, REOPENED}. If the nearby issue is `RESOLVED`/`CITIZEN_VERIFIED`, a new report creates a new issue. [DEC]
- Merge: only an issue still in {VERIFICATION, GROUPED, PRIORITIZED} can be merged **into** another active issue (prevents orphaning assigned work). [DEC]

---

## 7. DATABASE SCHEMA (PostgreSQL) — write as migrations 001–004

```sql
-- 001_extensions_enums.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE org_type        AS ENUM ('GRAM_PANCHAYAT','NAGAR_PANCHAYAT','MUNICIPALITY','CAMPUS','RESIDENTIAL_COMMUNITY');
CREATE TYPE user_role       AS ENUM ('CITIZEN','WORKER','ADMIN');
CREATE TYPE issue_status    AS ENUM ('REPORTED','VERIFICATION','GROUPED','PRIORITIZED','ASSIGNED','IN_PROGRESS','RESOLVED','CITIZEN_VERIFIED','REOPENED');
CREATE TYPE priority_band   AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE severity_level  AS ENUM ('MINOR','SMALL_LOCAL','SIGNIFICANT','SERIOUS','DANGEROUS');
CREATE TYPE context_level   AS ENUM ('NORMAL','SENSITIVE_LOCATION','PUBLIC_FACILITY','EMERGENCY','PUBLIC_SAFETY');
CREATE TYPE media_kind      AS ENUM ('COMPLAINT','RESOLUTION_PROOF');
CREATE TYPE citizen_decision AS ENUM ('PENDING','VERIFIED','REJECTED');
CREATE TYPE actor_role      AS ENUM ('SYSTEM','CITIZEN','WORKER','ADMIN');
```
```sql
-- 002_core_tables.sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  type org_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_m integer,
  UNIQUE (organization_id, name)
);

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, name)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  key text NOT NULL,
  name text NOT NULL,
  category_score smallint NOT NULL CHECK (category_score BETWEEN 0 AND 20),
  default_team_id uuid REFERENCES teams(id),
  keywords text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, key)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  role user_role NOT NULL,
  full_name text NOT NULL,
  mobile text,
  email text,
  password_hash text NOT NULL,
  ward_id uuid REFERENCES wards(id),
  team_id uuid REFERENCES teams(id),
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mobile IS NOT NULL OR email IS NOT NULL),
  CHECK (role <> 'WORKER' OR team_id IS NOT NULL)
);
CREATE UNIQUE INDEX users_org_mobile_uq ON users (organization_id, mobile) WHERE mobile IS NOT NULL;
CREATE UNIQUE INDEX users_org_email_uq  ON users (organization_id, email)  WHERE email  IS NOT NULL;

CREATE TABLE org_settings (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  key text NOT NULL,
  value jsonb NOT NULL,
  PRIMARY KEY (organization_id, key)
);
```
```sql
-- 003_workflow_tables.sql
CREATE SEQUENCE complaint_no_seq START 1;

CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  ward_id uuid NOT NULL REFERENCES wards(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  status issue_status NOT NULL DEFAULT 'REPORTED',
  title text NOT NULL,
  summary text,
  summary_source text CHECK (summary_source IN ('ai','fallback')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  primary_complaint_id uuid,
  severity severity_level NOT NULL DEFAULT 'SMALL_LOCAL',
  severity_reviewed boolean NOT NULL DEFAULT false,
  context context_level NOT NULL DEFAULT 'NORMAL',
  affected_override integer CHECK (affected_override IS NULL OR affected_override >= 1),
  priority_score smallint NOT NULL DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 100),
  priority_band priority_band NOT NULL DEFAULT 'LOW',
  priority_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_override_band priority_band,
  priority_override_reason text,
  verification_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_team_id uuid REFERENCES teams(id),
  assigned_worker_id uuid REFERENCES users(id),
  assigned_at timestamptz,
  started_at timestamptz,
  resolved_at timestamptz,
  verified_at timestamptz,
  reopened_count integer NOT NULL DEFAULT 0,
  approved_external_delay_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (approved_external_delay_hours >= 0),
  merged_into_issue_id uuid REFERENCES issues(id),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (priority_override_band IS NULL OR priority_override_reason IS NOT NULL)
);

CREATE TABLE complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_no bigint NOT NULL DEFAULT nextval('complaint_no_seq') UNIQUE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  issue_id uuid NOT NULL REFERENCES issues(id),
  citizen_id uuid NOT NULL REFERENCES users(id),
  ward_id uuid NOT NULL REFERENCES wards(id),
  category_id uuid NOT NULL REFERENCES categories(id),
  description text NOT NULL CHECK (length(btrim(description)) >= 10),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  is_primary boolean NOT NULL DEFAULT false,
  joined_existing boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE issues ADD CONSTRAINT issues_primary_complaint_fk
  FOREIGN KEY (primary_complaint_id) REFERENCES complaints(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  uploader_id uuid NOT NULL REFERENCES users(id),
  kind media_kind NOT NULL,
  complaint_id uuid REFERENCES complaints(id),
  issue_id uuid REFERENCES issues(id),
  resolution_id uuid,
  storage_path text NOT NULL,
  mime text NOT NULL,
  size_bytes bigint NOT NULL,
  original_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='COMPLAINT' AND complaint_id IS NOT NULL) OR (kind='RESOLUTION_PROOF' AND issue_id IS NOT NULL))
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  worker_id uuid NOT NULL REFERENCES users(id),
  assigned_by uuid NOT NULL REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  band_at_assignment priority_band NOT NULL,
  expected_hours integer NOT NULL,
  start_was_timely boolean,
  ended_at timestamptz,
  ended_reason text CHECK (ended_reason IN ('RESOLVED','REASSIGNED')),
  reassign_reason text
);

CREATE TABLE resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id),
  assignment_id uuid NOT NULL REFERENCES assignments(id),
  worker_id uuid NOT NULL REFERENCES users(id),
  resolved_by_role actor_role NOT NULL CHECK (resolved_by_role IN ('WORKER','ADMIN')),
  note text NOT NULL,
  ai_draft_used boolean NOT NULL DEFAULT false,
  proof_count integer NOT NULL DEFAULT 0,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  elapsed_hours numeric(10,2) NOT NULL,
  external_delay_hours numeric(10,2) NOT NULL DEFAULT 0,
  effective_hours numeric(10,2) NOT NULL,
  expected_hours integer NOT NULL,
  on_time boolean NOT NULL,
  citizen_decision citizen_decision NOT NULL DEFAULT 'PENDING',
  decided_at timestamptz,
  reject_reason text,
  CHECK (citizen_decision <> 'REJECTED' OR reject_reason IS NOT NULL)
);
ALTER TABLE media ADD CONSTRAINT media_resolution_fk FOREIGN KEY (resolution_id) REFERENCES resolutions(id);

CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id uuid NOT NULL UNIQUE REFERENCES resolutions(id),
  issue_id uuid NOT NULL REFERENCES issues(id),
  citizen_id uuid NOT NULL REFERENCES users(id),
  worker_id uuid NOT NULL REFERENCES users(id),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE issue_events (
  id bigserial PRIMARY KEY,
  issue_id uuid NOT NULL REFERENCES issues(id),
  actor_id uuid REFERENCES users(id),
  actor_role actor_role NOT NULL,
  event_type text NOT NULL,
  from_status issue_status,
  to_status issue_status,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  issue_id uuid REFERENCES issues(id),
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  kind text NOT NULL CHECK (kind IN ('CATEGORY','SIMILAR_ISSUE','SUMMARY','STATUS_EXPLAIN','COPILOT','RESOLUTION_REPORT','ADMIN_INSIGHT')),
  method text NOT NULL,
  complaint_id uuid REFERENCES complaints(id),
  issue_id uuid REFERENCES issues(id),
  payload jsonb NOT NULL,
  accepted boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
```sql
-- 004_indexes.sql
CREATE INDEX issues_org_status_idx   ON issues (organization_id, status);
CREATE INDEX issues_ward_cat_idx     ON issues (ward_id, category_id);
CREATE INDEX issues_worker_idx       ON issues (assigned_worker_id) WHERE assigned_worker_id IS NOT NULL;
CREATE INDEX issues_team_idx         ON issues (assigned_team_id)   WHERE assigned_team_id   IS NOT NULL;
CREATE INDEX issues_geo_idx          ON issues (lat, lng);
CREATE INDEX complaints_issue_idx    ON complaints (issue_id);
CREATE INDEX complaints_citizen_idx  ON complaints (citizen_id, created_at DESC);
CREATE INDEX assignments_worker_idx  ON assignments (worker_id);
CREATE INDEX assignments_issue_idx   ON assignments (issue_id);
CREATE INDEX resolutions_worker_idx  ON resolutions (worker_id);
CREATE INDEX resolutions_issue_idx   ON resolutions (issue_id);
CREATE INDEX events_issue_idx        ON issue_events (issue_id, created_at);
CREATE INDEX notif_user_idx          ON notifications (user_id, is_read, created_at DESC);
```

---

## 8. BUSINESS RULES & FORMULAS (all implemented as pure functions in `backend/src/domain/` with unit tests)

See spec in `docs/PROJECT_SPEC.md` for full definitions and acceptance test vectors.
