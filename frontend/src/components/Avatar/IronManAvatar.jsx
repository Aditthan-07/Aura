import { useState, useEffect, useRef, useMemo } from "react";

// Theme settings for the Iron Man Holographic HUD
const HUD_THEMES = {
  calm: {
    primary: "#00f0ff",
    secondary: "#00a8ff",
    coreGlow: "rgba(0, 240, 255, 0.9)",
    coreAmbient: "rgba(0, 210, 255, 0.3)",
  },
  curious: {
    primary: "#818cf8",
    secondary: "#6366f1",
    coreGlow: "rgba(129, 140, 248, 0.9)",
    coreAmbient: "rgba(99, 102, 241, 0.3)",
  },
  happy: {
    primary: "#38bdf8",
    secondary: "#f59e0b",
    coreGlow: "rgba(56, 189, 248, 0.95)",
    coreAmbient: "rgba(245, 158, 11, 0.3)",
  },
  excited: {
    primary: "#38bdf8",
    secondary: "#e0f2fe",
    coreGlow: "rgba(56, 189, 248, 1.0)",
    coreAmbient: "rgba(56, 189, 248, 0.4)",
  },
  sad: {
    primary: "#64748b",
    secondary: "#475569",
    coreGlow: "rgba(100, 116, 139, 0.7)",
    coreAmbient: "rgba(71, 85, 105, 0.25)",
  },
  frustrated: {
    primary: "#f43f5e",
    secondary: "#dc2626",
    coreGlow: "rgba(244, 63, 94, 0.95)",
    coreAmbient: "rgba(220, 38, 38, 0.35)",
  },
  neutral: {
    primary: "#00f0ff",
    secondary: "#0284c7",
    coreGlow: "rgba(0, 240, 255, 0.9)",
    coreAmbient: "rgba(2, 132, 199, 0.3)",
  },
};

export default function IronManAvatar({
  emotion,
  isThinking,
  isStreaming,
  voiceState,
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pulsePhase, setPulsePhase] = useState(0);

  const theme = useMemo(() => {
    if (voiceState === "error") {
      return HUD_THEMES.frustrated;
    }
    const label = emotion?.label?.toLowerCase() || "neutral";
    return HUD_THEMES[label] || HUD_THEMES.neutral;
  }, [emotion, voiceState]);

  // Restrained, smooth interactive parallax tracking mouse coordinates
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 8; // -4 to +4 deg
      const y = (e.clientY / innerHeight - 0.5) * -6; // -3 to +3 deg
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Smooth, calm animation clock (slow and elegant, not frantic)
  useEffect(() => {
    let animId;
    const animate = (time) => {
      setPulsePhase(time * 0.0008);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Subtle speed modulation when active
  const rotationSpeed = isThinking || isStreaming ? 1.5 : voiceState === "speaking" ? 1.2 : 0.8;

  return (
    <div
      ref={containerRef}
      className="arcis-hud-stage"
      style={{
        "--hud-primary": theme.primary,
        "--hud-secondary": theme.secondary,
        "--hud-core-glow": theme.coreGlow,
        "--hud-core-ambient": theme.coreAmbient,
      }}
    >
      {/* 3D Holographic Parallax Wrapper */}
      <div
        className="arcis-hud-scene"
        style={{
          transform: `perspective(1000px) rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
        }}
      >
        {/* Main Iron Man Blueprint Figure */}
        <div className="arcis-blueprint-frame">
          {/* Authentic High-Resolution Blueprint Artwork */}
          <img
            src="/ironman_blueprint.jpg"
            alt="Iron Man Mark VII Holographic Blueprint"
            className="arcis-blueprint-image"
          />

          {/* Interactive Overlay Layer */}
          <div className="arcis-interactive-layer">
            {/* 1. GLOWING CYAN EYE SLITS */}
            <div
              className={`hud-eyes ${
                voiceState === "speaking"
                  ? "hud-eyes--speaking"
                  : voiceState === "listening"
                  ? "hud-eyes--listening"
                  : isThinking || isStreaming
                  ? "hud-eyes--thinking"
                  : "hud-eyes--idle"
              }`}
            >
              <svg viewBox="0 0 100 24" className="hud-eyes-svg">
                <defs>
                  <filter id="hudEyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Left Eye Slit */}
                <polygon
                  points="14,4 42,9 38,19 18,13"
                  fill="#ffffff"
                  stroke={theme.primary}
                  strokeWidth="2"
                  filter="url(#hudEyeGlow)"
                />
                {/* Right Eye Slit */}
                <polygon
                  points="86,4 58,9 62,19 82,13"
                  fill="#ffffff"
                  stroke={theme.primary}
                  strokeWidth="2"
                  filter="url(#hudEyeGlow)"
                />
              </svg>
            </div>

            {/* 2. SOPHISTICATED SLOW-ROTATING ARC REACTOR */}
            <div className="hud-arc-reactor">
              <svg viewBox="0 0 200 200" className="hud-reactor-svg">
                <defs>
                  <filter id="hudReactorGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="hudUnibeamGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="28%" stopColor={theme.primary} stopOpacity="0.85" />
                    <stop offset="60%" stopColor={theme.secondary} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Ambient Radial Unibeam Field */}
                <circle cx="100" cy="100" r="94" fill="url(#hudUnibeamGradient)" opacity="0.6" />

                {/* Outer Structural Mounting Ring */}
                <circle cx="100" cy="100" r="76" fill="none" stroke={theme.primary} strokeWidth="2.4" opacity="0.85" filter="url(#hudReactorGlow)" />
                <circle cx="100" cy="100" r="70" fill="none" stroke={theme.primary} strokeWidth="1" strokeDasharray="8 4" opacity="0.65" />

                {/* Layer 1: 10 Radial Stator Coils (Slow Clockwise Rotation) */}
                <g style={{ transformOrigin: "100px 100px", transform: `rotate(${pulsePhase * 18 * rotationSpeed}deg)` }}>
                  {[...Array(10)].map((_, i) => (
                    <g key={i} transform={`rotate(${i * 36} 100 100)`}>
                      <rect
                        x="93"
                        y="30"
                        width="14"
                        height="16"
                        rx="2"
                        fill="#050e1d"
                        stroke={theme.primary}
                        strokeWidth="1.5"
                      />
                      <line x1="96" y1="38" x2="104" y2="38" stroke="#ffffff" strokeWidth="1.2" opacity="0.9" />
                    </g>
                  ))}
                </g>

                {/* Layer 2: Middle Turbine Gear Ring (Slow Counter-Clockwise Rotation) */}
                <g style={{ transformOrigin: "100px 100px", transform: `rotate(${-pulsePhase * 24 * rotationSpeed}deg)` }}>
                  <circle cx="100" cy="100" r="48" fill="none" stroke={theme.primary} strokeWidth="1.8" opacity="0.8" />
                  {[...Array(16)].map((_, i) => (
                    <line
                      key={i}
                      x1="100"
                      y1="52"
                      x2="100"
                      y2="59"
                      stroke={theme.primary}
                      strokeWidth="1.8"
                      transform={`rotate(${i * 22.5} 100 100)`}
                    />
                  ))}
                </g>

                {/* Layer 3: High-Velocity Inner Micro Rotor (Smooth Clockwise) */}
                <g style={{ transformOrigin: "100px 100px", transform: `rotate(${pulsePhase * 45 * rotationSpeed}deg)` }}>
                  <circle cx="100" cy="100" r="30" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeDasharray="5 3" opacity="0.85" />
                  <circle cx="100" cy="100" r="22" fill="none" stroke={theme.primary} strokeWidth="1.8" />
                </g>

                {/* Layer 4: Central Glowing Unibeam Core */}
                <circle
                  cx="100"
                  cy="100"
                  r={voiceState === "speaking" ? 13 : 11}
                  fill="#ffffff"
                  filter="url(#hudReactorGlow)"
                  style={{
                    transformOrigin: "100px 100px",
                    transform: `scale(${1 + Math.sin(pulsePhase * 3) * 0.07})`,
                    transition: "r 0.2s ease-out",
                  }}
                />
                <circle cx="100" cy="100" r="5" fill="#ffffff" />
              </svg>
            </div>

            {/* 3. TECHNICAL HUD CALIPER OVERLAYS */}
            {/* Top-Left CAD Blueprint Schematics Caliper */}
            <div className="hud-schematic-left">
              <svg viewBox="0 0 120 120" className="hud-schematic-svg">
                <g style={{ transformOrigin: "60px 60px", transform: `rotate(${pulsePhase * 15 * rotationSpeed}deg)` }}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="6 3" opacity="0.6" />
                  <circle cx="60" cy="60" r="36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="18 6" opacity="0.75" />
                  {[...Array(6)].map((_, i) => (
                    <line key={i} x1="60" y1="8" x2="60" y2="16" stroke="currentColor" strokeWidth="1.5" transform={`rotate(${i * 60} 60 60)`} />
                  ))}
                </g>
                <line x1="60" y1="4" x2="60" y2="116" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.35" />
                <line x1="4" y1="60" x2="116" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.35" />
              </svg>
            </div>

            {/* Top-Right Rotor Generator Caliper */}
            <div className="hud-schematic-right">
              <svg viewBox="0 0 120 120" className="hud-schematic-svg">
                <g style={{ transformOrigin: "60px 60px", transform: `rotate(${-pulsePhase * 25 * rotationSpeed}deg)` }}>
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 4" opacity="0.65" />
                  <circle cx="60" cy="60" r="28" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
                  {[...Array(8)].map((_, i) => (
                    <line key={i} x1="60" y1="32" x2="60" y2="40" stroke="currentColor" strokeWidth="1.8" transform={`rotate(${i * 45} 60 60)`} />
                  ))}
                </g>
              </svg>
            </div>

            {/* Bottom-Left Tachometer / Digital HUD Dial */}
            <div className="hud-schematic-dial">
              <svg viewBox="0 0 120 120" className="hud-schematic-svg">
                <g style={{ transformOrigin: "60px 60px", transform: `rotate(${pulsePhase * 20 * rotationSpeed}deg)` }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="24 10 6 4" opacity="0.7" />
                  <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.45" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
