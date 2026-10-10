# DECISIONS LOG (CivicPulse)

All implementation decisions [DEC] and placeholder defaults [PLACEHOLDER] used in CivicPulse according to the specification.

## [DEC] Decisions
1. **Stack Architecture**: Split into 4 parts:
   - `frontend/`: React 18 + TypeScript + Vite + Tailwind CSS 3.4
   - `backend/`: Next.js 14.2 (App Router route handlers only) + TypeScript
   - `database/`: PostgreSQL 15+ (plain pg client, parameterized queries, no ORM)
   - `ai-service/`: Python 3.11+ FastAPI microservice (stateless)
2. **Language**: TypeScript for frontend and backend. Python for AI service.
3. **Ports**: Frontend 5173, Backend 3001, AI service 8001, Postgres 5432.
4. **Vite Proxy**: `/api` proxied to `http://localhost:3001`.
5. **Auth**: JWT (HS256 via `jose`) stored in httpOnly, SameSite=Lax cookie (`cp_token`). Passwords hashed with `bcryptjs` (salt rounds 10).
6. **Mobile Number Normalization**: Strips spaces, `+`, `-`, checks length 7–15 digits.
7. **Organization Scoping**: All queries filtered by authenticated user's `organization_id`.
8. **Worker/Citizen Privacy**:
   - Citizens see assigned team name only (`Water Team`), not worker identity.
   - Workers do not see citizen contact details or name.
   - Public/community endpoints return aggregates only (no complaint text, IDs, reporter info, media).
9. **State Transitions**:
   - Handled exclusively by `domain/stateMachine.ts`.
   - `REPORTED` -> `VERIFICATION` -> `GROUPED` -> `PRIORITIZED` executed automatically within the complaint submission transaction.
   - `RESOLVED` displays as "Resolved — Awaiting Citizen Confirmation".
   - `CITIZEN_VERIFIED` is the only terminal state.
10. **Verification Authority**: Only primary reporter can verify or reject resolution.
11. **Haversine Geo Calculations**: Implemented in `lib/geo.ts` (pure TypeScript) without PostGIS dependency for portability.
12. **Pure Domain Modules**: All business logic (priority, worker scores, team scores, hotspots, alerts, recommendations) implemented as pure functions with 100% test vectors coverage.
13. **Monochrome Design System**: Strictly monochrome grayscale palette (`#FFFFFF`, `#F7F7F7`, `#F0F0F0`, `#ECECEC`, `#E0E0E0`, `#A0A09F`, `#110D0C`, `#000000`). No color accents. Light mode only.
14. **Worker Performance Score**: Admin-on-behalf resolutions are excluded from individual worker scores but included in team metrics. Pending citizen resolutions are excluded from VRR denominator.
15. **LLM Agnostic**: OpenAI-compatible endpoint used when configured; fallback to deterministic templates when AI service is down or unconfigured.

## [PLACEHOLDER] Values (Needs Owner Confirmation)
- `MAX_IMAGE_MB`: 10 MB
- `MAX_VIDEO_MB`: 25 MB
- `MAX_FILES_PER_COMPLAINT`: 5 files
- `AI_TIMEOUT_MS`: 4000 ms
- `sla_hours.CRITICAL`: 48 hours
- `sla_hours.HIGH`: 96 hours
- `sla_hours.MEDIUM`: 168 hours
- `sla_hours.LOW`: 240 hours
- `start_work_window_hours`: 24 hours
- `similar_radius_m`: 500 meters
- `similarity_threshold`: 0.60
- `hotspot_default_days`: 90 days
- `alert.worker_overload_factor`: 1.5
- `alert.worker_overload_min_active`: 3
- `alert.reopen_rate_pct`: 20%
- `alert.reopen_min_resolutions`: 5
- `alert.ward_surge_factor`: 1.5
- `alert.ward_surge_min_reports`: 5
