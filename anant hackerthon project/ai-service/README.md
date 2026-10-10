# CivicPulse AI Service

FastAPI microservice for civic complaint categorization, similarity detection, summarization, and copilot assistance.

## Architecture
- Completely stateless.
- Never connects to PostgreSQL or calls the frontend.
- Backend communicates with this service via HTTP POST on port 8001 using `X-Internal-Key` header authentication.
- When LLM is unconfigured or AI service is stopped, the backend automatically uses deterministic template fallbacks without failing user requests.

## Setup & Run
```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --port 8001 --host 0.0.0.0
```
