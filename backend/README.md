# Aura — Backend

FastAPI service that powers Aura's chat + emotion reading.

## Structure

```
app/
├── main.py            FastAPI app, CORS, health check
├── routes/chat.py      POST /api/chat
├── services/llm_service.py   Anthropic API call, forced tool-use
├── models/schemas.py   Pydantic request/response contracts
└── core/config.py      Env-based settings
```

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`.

## API

### `POST /api/chat`

**Request**
```json
{
  "message": "hey, how's it going",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response**
```json
{
  "reply": "Going well — what's on your mind?",
  "emotion": { "label": "curious", "valence": 0.3, "arousal": 0.4 }
}
```

`history` is the prior conversation (excluding the new `message`); the
frontend owns and sends the full running history each turn since the
backend is stateless. It's trimmed server-side to the last
`MAX_HISTORY_MESSAGES` turns (default 20) before being sent to the model.

### `GET /health`

Returns `{"status": "ok"}` — useful for uptime checks / container health
probes if you deploy this.

## Why forced tool-use instead of "reply in JSON"

Asking a model to "respond only in valid JSON" is fragile — it can wrap the
JSON in prose, use inconsistent field names, or produce malformed output
under load. Forcing a tool call (`tool_choice: {"type": "tool", "name":
"respond"}`) makes the schema part of the API contract: the SDK won't
return a tool_use block unless the arguments match the declared JSON
schema, so `llm_service.py` can parse `tool_use.input` directly with no
regex or `try/except json.loads` defensive code.
