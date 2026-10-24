# PrepMate AI — Server (FastAPI + LangChain + Grok)

## Run locally
```bash
cd Server
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # fill in MONGOURI, JWT_SECRET, REDIS_URL, GROQ_API_KEY
uvicorn app.main:app --reload --port 3000
```
Interactive API docs (non-production only): http://localhost:3000/docs  

Report generation uses Groq's OpenAI-compatible API. Set `GROQ_API_KEY` from
https://console.groq.com/keys. `GROQ_MAX_TOKENS` controls the report output budget
(default `4096`); extraction is capped separately to reduce free-tier token usage.
Authentication and invalid-request responses are not retried, while rate-limit retries wait
before sending another request.
Rotate any key that has been exposed in logs, screenshots, or committed/local environment files.

## API (unchanged from the Node version, so the React client works as-is)
| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` `/api/auth/login` | sets httpOnly JWT cookie |
| GET | `/api/auth/logout` `/api/auth/get-me` | logout blacklists the token in Redis |
| GET | `/api/interview` | current user's reports (resume text excluded) |
| POST | `/api/interview` | multipart: `resume` (PDF), `jobDescription`, `selfDescription` |
| DELETE | `/api/interview/{id}` | |
| GET | `/health` | |

## How report generation works (`app/services/ai.py`)
1. **Extract** (fast Grok model, temp 0, run in parallel via `RunnableParallel`): resume → `CandidateProfile`, job description → `JobProfile`.
2. **Generate** (main Groq model, temp 0.3): profiles + source text → `Report`, enforced by a Pydantic schema through function-calling structured output.
3. **Calibrate** (deterministic): the model's score is blended 70/30 with the share of the job's must-have skills actually present in the resume, and provably missing must-haves are added as high-severity gaps.

Results are cached in Redis by hash of (model, resume, self-description, JD), so repeat submissions cost nothing.
