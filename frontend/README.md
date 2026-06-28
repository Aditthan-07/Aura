# Aura — Frontend

React + Vite + Three.js client.

## Structure

```
src/
├── App.jsx                          Layout: orb layer + header + chat layer
├── components/
│   ├── Avatar/
│   │   ├── AuraOrb.jsx              R3F Canvas + the orb mesh/animation
│   │   └── orbShaders.js            Vertex/fragment GLSL
│   ├── Chat/
│   │   ├── ChatPanel.jsx
│   │   ├── MessageList.jsx
│   │   └── MessageInput.jsx
│   └── EmotionReadout.jsx           Live valence/arousal/label readout
├── hooks/useChat.js                 Conversation state + API calls
├── services/api.js                  fetch wrapper for the backend
└── styles/index.css                 Design tokens + all styling
```

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## How the orb animates

`AuraOrb.jsx` keeps the orb's *displayed* color/arousal in a ref that's
lerped toward the latest emotion reading every frame (`useFrame`), rather
than snapping instantly — so a shift from "calm" to "excited" reads as a
mood change over ~1-2 seconds, not a jump cut. The shader itself
(`orbShaders.js`) uses 3D simplex noise to displace an icosahedron's
vertices; arousal controls the noise frequency, amplitude, and time-scroll
speed, so higher arousal looks more turbulent and faster-moving, not just
"more saturated."

Color is computed in JS (`valenceToColor`) as a 3-stop gradient — indigo →
teal → amber — and passed to the shader as a single `u_color` uniform, kept
deliberately simple so the color logic lives in one readable place instead
of being duplicated in GLSL.
