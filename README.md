# Aura

A chatbot companion whose 3D avatar isn't a face — it's an abstract, glowing
orb that morphs in real time with the emotional tone of the conversation.

Instead of bolting a separate sentiment-analysis model onto a chat UI, Aura
asks the LLM itself to report how it's reading the exchange — valence
(positive/negative), arousal (calm/energized), and a label — on the same
turn it replies. The orb's color, turbulence, and motion are a direct,
continuous function of that reading. The exact numbers are also shown as a
small monospace readout, so the visual is explainable, not just decorative.

## Stack

- **Backend** — FastAPI (Python). One endpoint, `/api/chat`, that calls the
  Anthropic API with forced tool-use so the structured emotion reading is
  guaranteed valid on every response, not just hoped-for JSON.
- **Frontend** — React + Vite + `@react-three/fiber`. The orb is a custom
  GLSL shader (simplex-noise vertex displacement + fresnel rim glow) driven
  by uniforms that smoothly lerp toward the latest emotion reading.

```
aura/
├── backend/    FastAPI app — see backend/README.md
└── frontend/   React + Three.js app — see frontend/README.md
```

## Quick start

You'll need an [Gemini API key]

**1. Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      
uvicorn app.main:app --reload
```

**2. Frontend** (in a second terminal)
```bash
cd frontend
npm install
cp .env.example .env        # defaults already point at localhost:8000
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`) and talk to
Aura. Watch the orb.

## Design notes

The orb's color is a continuous gradient over valence — indigo (negative)
through teal (neutral) to amber (positive) — rather than a lookup table of
discrete "mood colors," so it reflects a real number, not a guess at a
category. Arousal separately drives animation speed, surface turbulence,
and glow intensity. Both values are smoothed frame-to-frame so emotional
shifts read as a mood change rather than a jump cut.

## Extending it

A few natural next steps if you want to keep building:
- Persist conversation history (currently in-memory, lost on refresh)
- Stream replies token-by-token instead of waiting for the full response
- Add voice input/output, with the orb's arousal also reacting to speech
  amplitude in real time
- Swap the LLM provider behind `backend/app/services/llm_service.py`
