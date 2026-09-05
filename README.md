# ARCIS — Autonomous Reactor Core Intelligent System ⚡

[![Marvel MCU Companion](https://img.shields.io/badge/Marvel-MCU%20Intelligence-red.svg)](https://marvel.com)
[![Stark Industries](https://img.shields.io/badge/Stark%20Tech-Mark%20VII%20Blueprint-00f0ff.svg)](#)
[![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://vitejs.dev)

**ARCIS** is an immersive, futuristic AI companion designed exclusively for Marvel and MCU fans. Engineered with a Stark Industries holographic HUD aesthetic, ARCIS combines an authentic interactive Iron Man blueprint interface with deep, structured Marvel intelligence.

---

## ✨ Features

- **🦾 Dedicated Dual-Panel Split Interface**:
  - **Left Panel (Holographic Visualization)**: Authentic Iron Man Mark VII blueprint artwork featuring interactive glowing cyan eye slits, a multi-tier mechanically rotating Arc Reactor core (stator coils, turbine gears, unibeam flare), CAD calipers, live telemetry status bars, and subtle 3D mouse parallax tracking.
  - **Right Panel (Command Center)**: Dedicated Marvel AI chat console, real-time token-by-token streaming, tactical directive chips, and mission history logs.
- **🌌 Comprehensive Marvel & MCU Intelligence**:
  - Deep lore coverage spanning Earth-616 comics and MCU Phases 1 through 6.
  - Stark Tech engineering breakdowns (Mark I through Mark LXXXV, nanotech, repulsors, unibeam, vibranium integration).
  - Multiverse timeline analysis, TVA mechanics, sacred timeline incursions, and comic-to-screen comparisons.
  - Clean, structured markdown responses with tactical headers and bulleted breakdowns.
- **🎙️ Speech & Voice Interaction**:
  - Voice input with live speech recognition.
  - Speech synthesis output synchronized with the Arc Reactor and eye slit illumination pulses.
- **📜 Mission Logs & Session Management**:
  - Instant session switching, multi-mission history, and clean conversational state management.
  - One-click New Mission initialization.

---

## 🛠️ Architecture & Tech Stack

```
Arcis/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application, CORS, and health check
│   │   ├── routes/chat.py       # Streaming SSE chat endpoints
│   │   ├── services/
│   │   │   ├── groq_service.py  # High-speed LLM engine with ARCIS Marvel system prompt
│   │   │   └── api_key_manager.py
│   │   ├── models/schemas.py    # Request & response contracts
│   │   └── core/config.py       # Configuration and provider settings
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Dual-panel split layout & state orchestration
    │   ├── components/
    │   │   ├── Avatar/
    │   │   │   └── IronManAvatar.jsx   # Holographic blueprint, eyes & rotating Arc Reactor
    │   │   ├── Chat/
    │   │   │   ├── ChatPanel.jsx       # Chat container & quick directives
    │   │   │   ├── MessageList.jsx     # High-contrast holographic message bubbles
    │   │   │   └── MessageInput.jsx    # Translucent command input console
    │   │   └── Sidebar/
    │   │       └── SessionSidebar.jsx  # Collapsible mission logs drawer
    │   ├── hooks/useChat.js     # State management, streaming handlers & storage
    │   ├── services/
    │   │   ├── api.js           # Fetch & SSE streaming client
    │   │   ├── chatStorage.js   # Local mission session persistence
    │   │   └── voiceService.js  # Speech recognition & audio synthesis
    │   └── styles/
    │       ├── index.css        # Stark HUD theme, cyan neon tokens, and layout
    │       └── ironman.css      # Blueprint animations, Arc Reactor shaders, and parallax
    └── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- An active API key (Groq, OpenAI, or Gemini)

### 2. Backend Setup

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
# Open .env and add your GROQ_API_KEY (or GEMINI_API_KEY / OPENAI_API_KEY)

# Start backend server (runs on port 8001)
uvicorn app.main:app --port 8001 --reload
```

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install packages
npm install

# Configure environment
cp .env.example .env

# Launch Vite development server (runs on port 5173)
npm run dev
```

Open your browser at `http://localhost:5173` to initialize Protocol ARCIS.

---

## 🎯 Quick Directives

ARCIS features built-in tactical quick directives:
- `⚡ Stark Tech Breakdown` — In-depth schematics of armor, nanotech, and arc reactor physics.
- `🌌 Multiverse Timeline` — Branch analyses, nexus events, incursions, and the TVA.
- `🛡️ Vibranium vs Adamantium` — Molecular composition, origins, and combat capabilities.
- `🎬 MCU Phase Guide` — Chronological breakdowns, key arcs, and post-credit connections.

---

## 🔒 Security & Privacy

- All API keys are securely managed on the backend and never exposed to the client.
- Mission sessions are stored locally in client storage with zero external tracking.

---

## 📜 License

MIT License — Built with ❤️ for Marvel fans and Stark Industries enthusiasts.

