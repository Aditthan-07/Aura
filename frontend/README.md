# ARCIS — Frontend

Modern React + Vite frontend client for ARCIS (Autonomous Reactor Core Intelligent System).

## Key Components

- **Dual-Panel Split-Screen Architecture**:
  - `src/components/Avatar/IronManAvatar.jsx`: Dedicated Stark Industries Mark VII holographic blueprint panel with interactive cyan glowing eye slits, a multi-ring mechanically rotating Arc Reactor core, CAD calipers, and 3D parallax tracking.
  - `src/components/Chat/ChatPanel.jsx`: Dedicated Marvel AI command console with tactical quick directives, token-by-token streaming, and Markdown parsing.
  - `src/components/Sidebar/SessionSidebar.jsx`: Collapsible mission logs drawer for managing multi-session conversation history.
- **State & Communication**:
  - `src/hooks/useChat.js`: Orchestrates chat messages, emotion feedback, streaming SSE consumption, and speech synchronization.
  - `src/services/api.js`: Server-sent events (SSE) streaming client.
  - `src/services/chatStorage.js`: Multi-mission localStorage persistence.
  - `src/services/voiceService.js`: Web Speech API integration for tactical voice input and speech synthesis.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

Server runs by default at `http://localhost:5173`.

