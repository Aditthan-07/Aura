# ARCIS — Backend

FastAPI service powering the Marvel AI intelligence engine and streaming responses for ARCIS (Autonomous Reactor Core Intelligent System).

## Structure

```
app/
├── main.py                   # FastAPI initialization, CORS, and health check
├── routes/chat.py             # POST /api/chat and POST /api/chat/stream endpoints
├── services/
│   ├── groq_service.py       # High-speed LLM client with dedicated Marvel MCU prompt
│   └── api_key_manager.py    # Key rotation and rate limit handling
├── models/schemas.py         # Request and response models
└── core/config.py            # Environment settings and provider configs
```

## Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Set GROQ_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY) in .env

# Launch development server (port 8001)
uvicorn app.main:app --port 8001 --reload
```

Interactive API documentation available at `http://localhost:8001/docs`.

## API Endpoints

### `POST /api/chat/stream` (SSE Streaming)
Streams token chunks and emotion analysis in Server-Sent Events (SSE) format:
- `data: {"type": "chunk", "content": "..."}`
- `data: {"type": "emotion", "emotion": {"label": "calm", "valence": 0.2, "arousal": 0.4}}`
- `data: {"type": "done"}`

### `GET /health`
Returns health check status:
```json
{
  "status": "ok"
}
```

