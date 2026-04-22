# AI Screening — Technical Overview

## Stack at a Glance

| Layer | Technology |
|---|---|
| **Backend API** | Python · FastAPI · Uvicorn |
| **Database** | MongoDB (Motor async driver) |
| **Auth** | JWT (python-jose) · bcrypt password hashing |
| **Voice AI** | Bolna API (outbound call orchestration & transcription) |
| **LLM Evaluation** | OpenAI `gpt-5-nano` via direct HTTP (httpx) |
| **Frontend** | React 18 · TypeScript · Vite |
| **State / Data-fetching** | TanStack Query (React Query) |
| **Routing** | React Router v6 |
| **Styling** | Vanilla CSS (custom design system, glassmorphism) |

---

## Repository Structure

```
AI_Screening/
├── backend/
│   ├── main.py              # FastAPI app entry point + lifespan runner
│   ├── database.py          # Motor client, collection references, index definitions
│   ├── models.py            # Pydantic models (request/response schemas)
│   ├── queue_worker.py      # Async background task: sequential interview dispatch
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py          # JWT login, admin setup, token validation
│   │   ├── jobs.py          # CRUD for job listings
│   │   ├── candidates.py    # Candidate apply + admin listing
│   │   ├── interviews.py    # Manual interview trigger + status fetch
│   │   └── webhooks.py      # Bolna webhook receiver + AI evaluation trigger
│   └── services/
│       ├── bolna.py         # Bolna API call wrapper (with retry + backoff)
│       └── llm.py           # OpenAI evaluation prompt + response parsing
└── frontend/
    └── src/
        ├── App.tsx           # Router config, nav shell, auth guard wiring
        ├── api.ts            # Axios instance (base URL + auth token injection)
        ├── pages/
        │   ├── PublicJobsList.tsx   # Public job board
        │   ├── PublicApply.tsx      # Dynamic candidate application form
        │   ├── AdminLogin.tsx       # JWT login form
        │   ├── JobsList.tsx         # Admin: all jobs + create job form
        │   ├── JobDashboard.tsx     # Admin: per-job candidate table + actions
        │   └── CandidateReview.tsx  # Admin: transcript + AI evaluation view
        └── components/
            └── AuthGuard.tsx        # Protects admin routes, redirects to /admin/login
```

---

## Backend Architecture

### Application Entry Point ([main.py](file:///c:/Users/priya/Documents/AI_Screening/backend/main.py))

FastAPI is initialised with a [lifespan](file:///c:/Users/priya/Documents/AI_Screening/backend/main.py#14-20) context manager that:
1. Spawns [process_queue()](file:///c:/Users/priya/Documents/AI_Screening/backend/queue_worker.py#13-77) as a background `asyncio.Task` on startup
2. Cancels it gracefully on shutdown

Five routers are mounted: `auth`, `jobs`, `candidates`, [interviews](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/interviews.py#11-68), `webhooks`.
A global exception handler logs all 500-level errors with full tracebacks.

---

### Data Layer ([database.py](file:///c:/Users/priya/Documents/AI_Screening/backend/database.py))

Uses **Motor** (async MongoDB driver) backed by a single `ai_screening_db` database with five collections:

| Collection | Purpose |
|---|---|
| `jobs` | Job postings created by admins |
| `candidates` | Applicants per job, track status + result |
| [interviews](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/interviews.py#11-68) | One record per call attempt, linked to candidate + job |
| `admin_users` | Single-admin credential store (bcrypt hashed) |
| `webhook_events` | (Reserved) raw webhook log |

**Indexes defined:**
- `jobs`: `status`, `created_at`
- `candidates`: `job_id`, `phone`
- [interviews](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/interviews.py#11-68): `execution_id` (unique), `candidate_id`, `job_id`

---

### Pydantic Models ([models.py](file:///c:/Users/priya/Documents/AI_Screening/backend/models.py))

Key schemas:

```python
class CandidateResponse:
    id, job_id, name, phone, email
    status: str          # applied | calling | in_progress | completed | no-answer | call-disconnected
    result: Optional[str] # passed | failed
    resume_url, extra_fields, created_at

class InterviewResponse:
    id, candidate_id, job_id, execution_id
    status: str          # calling | completed | ...
    transcript: Optional[str]
    reasoning: Optional[str]   # LLM explanation
    result: Optional[str]      # passed | failed
    duration, started_at, completed_at, created_at

class WebhookPayload:
    id: str              # Bolna execution_id
    status: str
    transcript: Optional[str]
    conversation_duration: Optional[float]
    # extra='allow' — accepts any extra fields Bolna sends
```

---

### Authentication ([routers/auth.py](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/auth.py))

- **Algorithm:** HS256 JWT, 7-day expiry
- **Endpoint:** `POST /auth/login` — accepts OAuth2 `form_data`, returns [access_token](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/auth.py#29-38)
- **Bootstrap:** `POST /auth/setup` — creates initial admin only if no admin exists (idempotent guard)
- **Dependency:** [get_current_admin](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/auth.py#44-63) is a FastAPI `Depends` injected into all protected routes to validate the Bearer token

```python
# Usage pattern in any protected router:
async def some_route(admin: AdminUserInDB = Depends(get_current_admin)):
    ...
```

---

### Interview Queue Worker ([queue_worker.py](file:///c:/Users/priya/Documents/AI_Screening/backend/queue_worker.py))

An `asyncio.Queue` holds candidate IDs to be called. The worker runs as a persistent background coroutine and:

1. **Dequeues** one `candidate_id` at a time (blocking `await`)
2. **Fetches** candidate + job from MongoDB
3. **Builds** a `variables` dict (name, job title, company, skills, requirements) injected into the Bolna call
4. **Calls** [create_call()](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py#11-39) → gets back a Bolna `execution_id`
5. **Inserts** an [interviews](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/interviews.py#11-68) document with `status: "calling"`
6. **Updates** candidate `status` → `"calling"`
7. **Sleeps 2 seconds** between calls to prevent Bolna rate-limit bursts

Candidates are enqueued when they submit an application via `POST /apply/:job_id`.

---

### Bolna Service ([services/bolna.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py))

Thin wrapper around the Bolna REST API:

```python
async def create_call(phone: str, variables: dict) -> dict:
    POST https://api.bolna.ai/call
    {
      "agent_id": BOLNA_AGENT_ID,
      "recipient_phone_number": phone,
      "from_phone_number": BOLNA_FROM_PHONE,
      "user_data": variables   # injected into Bolna agent as dynamic prompt vars
    }
```

**Retry logic:** 3 attempts with exponential backoff (1s, 2s). Raises on final failure.

All config comes from environment variables: `BOLNA_API_KEY`, `BOLNA_AGENT_ID`, `BOLNA_BASE_URL`, `BOLNA_FROM_PHONE`.

---

### Webhook Handler ([routers/webhooks.py](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/webhooks.py))

Bolna calls `POST /webhooks/bolna` at each call lifecycle event (ringing, in-progress, completed, call-disconnected, etc.).

**Key logic:**

```
1. Look up interview by execution_id
2. Normalise status:
   - If status == "call-disconnected" AND transcript exists → treat as "completed"
3. Persist update_data { status, transcript, duration, completed_at }
4. Mirror status onto candidate document
5. If final status == "completed" AND transcript present:
   → enqueue background task: process_evaluation()
```

[process_evaluation()](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/webhooks.py#10-31) calls the LLM service, writes `result` + `reasoning` back to the interview document, and mirrors `result` onto the candidate.

---

### LLM Evaluation Service ([services/llm.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/llm.py))

Sends a structured prompt to `gpt-5-nano` via `POST https://api.openai.com/v1/chat/completions` with `response_format: json_object`.

**Prompt variables injected:** job title, experience level, requirements, skills, full transcript.

**Output schema:**
```json
{
  "result": "passed" | "failed",
  "reasoning": "Paragraph explaining the evaluation decision."
}
```

Handles: empty responses, JSON parse failures, API errors — all default to `failed` with a descriptive reasoning string. Falls back to a dummy `passed` result if `OPENAI_API_KEY` is missing (useful for dev).

---

## Frontend Architecture

### API Client ([api.ts](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/api.ts))

Axios instance pre-configured with:
- `baseURL = http://localhost:8000`
- Request interceptor: reads `admin_token` from `localStorage` and injects `Authorization: Bearer <token>` header on every request

### Route Map

| Path | Component | Guard |
|---|---|---|
| `/` | `PublicJobsList` | None |
| `/apply/:job_id` | `PublicApply` | None |
| `/admin/login` | `AdminLogin` | None |
| `/admin/jobs` | `JobsList` | `AuthGuard` |
| `/admin/jobs/:id` | [JobDashboard](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/pages/JobDashboard.tsx#8-201) | `AuthGuard` |
| `/admin/candidate/:id` | [CandidateReview](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/pages/CandidateReview.tsx#7-144) | `AuthGuard` |

### Key Frontend Behaviours

**[PublicApply.tsx](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/pages/PublicApply.tsx)** — Fetches job to read `application_fields` (dynamic per job). Renders a form with only the fields defined for that job. On submit, `POST /apply/:job_id` enqueues the candidate for interview.

**[JobDashboard.tsx](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/pages/JobDashboard.tsx)** — Polls `/candidates?job_id=…` every 5 seconds. Allows:
- Checkbox selection of `applied | no-answer | call-disconnected` candidates for manual re-interview
- **Download Passed CSV** — client-side export of all `result === 'passed'` candidates (name, email, phone, status, date) — no server round-trip

**[CandidateReview.tsx](file:///c:/Users/priya/Documents/AI_Screening/frontend/src/pages/CandidateReview.tsx)** — Polls `/interviews/:id` every 3 seconds. Shows:
- Call transcript (raw text, monospaced)
- AI Evaluation panel: spinner while `status === completed && !reasoning`, then verdict badge + reasoning text

**`AuthGuard`** — Checks `localStorage.admin_token`. Redirects to `/admin/login` if absent.

---

## Data Flow: End-to-End

```
Candidate
  │ POST /apply/:job_id
  ▼
candidates_collection (status: "applied")
  + candidate_id pushed to interview_queue
  │
  ▼ (queue_worker picks up async)
Bolna API ← POST /call (with job-specific variables)
  │ returns execution_id
  ▼
interviews_collection (status: "calling")
candidates_collection (status: "calling")
  │
  ▼ (Bolna calls candidate, conducts interview)
  │
Bolna Webhook → POST /webhooks/bolna
  │
  ├─ status != "completed"?
  │    → update status only (ringing / in_progress / no-answer / call-disconnected without transcript)
  │
  └─ status == "completed" (or disconnected + transcript)?
       → update interview { status, transcript, completed_at }
       → background task: generate_evaluation(transcript, job)
            │
            ▼
         OpenAI gpt-5-nano
            │ returns { result, reasoning }
            ▼
         interviews_collection { result, reasoning }
         candidates_collection { result }
            │
            ▼
         Admin Dashboard (auto-polls, renders verdict)
```

---

## Environment Variables

| Variable | Used In | Purpose |
|---|---|---|
| `MONGODB_URL` | [database.py](file:///c:/Users/priya/Documents/AI_Screening/backend/database.py) | Full MongoDB connection URI |
| `BOLNA_API_KEY` | [services/bolna.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py) | Bolna API bearer token |
| `BOLNA_AGENT_ID` | [services/bolna.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py) | Bolna voice agent to use per call |
| `BOLNA_BASE_URL` | [services/bolna.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py) | Bolna API base (default: `https://api.bolna.ai`) |
| `BOLNA_FROM_PHONE` | [services/bolna.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/bolna.py) | Caller ID phone number |
| `OPENAI_API_KEY` | [services/llm.py](file:///c:/Users/priya/Documents/AI_Screening/backend/services/llm.py) | OpenAI API key for evaluation |
| `JWT_SECRET_KEY` | [routers/auth.py](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/auth.py) | HS256 signing secret (has hardcoded default for dev) |

---

## Known Limitations / MVP Decisions

- **Single admin user** — no multi-tenant or role-based access
- **In-memory queue** — `asyncio.Queue` is ephemeral; restarts lose pending queue items
- **No idempotency** on repeated webhook events (commented-out guard in [webhooks.py](file:///c:/Users/priya/Documents/AI_Screening/backend/routers/webhooks.py))
- **CORS is fully open** (`allow_origins=["*"]`) — tighten for production
- **No file upload** — resume URLs are stored as plain strings (candidate-provided)
- **Polling-based UI** — no WebSocket push; 5s/3s intervals in dashboard/review pages
