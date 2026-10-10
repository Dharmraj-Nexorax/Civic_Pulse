# QUESTIONS & OPEN ISSUES (CivicPulse)

Tracking all [OPEN] items and source ambiguities per Section 16 of `PROJECT_SPEC.md`.

1. **Stack wording**: Spec notes "Frontend: React+Tailwind+CSS · Backend: next.js". Built as separate `frontend/` (Vite) and `backend/` (Next.js API routes) to fulfill 4-folder separation.
2. **Map provider**: OpenStreetMap tiles with Leaflet, displayed in monochrome grayscale filter.
3. **LLM provider**: Compatible with any OpenAI-style chat completions endpoint; deterministic template fallbacks ensure 100% functionality without LLM.
4. **Who marks "Resolved"**: Assigned worker marks resolved; Admin can resolve on behalf with mandatory reason.
5. **Accept vs Start**: Combined into single `ASSIGNED -> IN_PROGRESS` action ("Accept & Start Work").
6. **Colors**: Monochrome grayscale strictly followed to preserve identity.
7. **Affected-citizens boundary**: Overlap at 100 resolved as: 51–100 -> 20 points, 101+ -> 25 points.
8. **Verified Resolution Rate (VRR)**: Denominator excludes PENDING resolutions: `VERIFIED / (VERIFIED + REJECTED)` so workers are not penalized while awaiting citizen response.
9. **Verification authority for grouped issues**: Primary reporter only.
10. **Rejection/Spam**: Not implemented as no rejection status exists in source state machine.
11. **SLA & Alert Placeholders**: Configured in `org_settings` with defaults until owner confirms.
