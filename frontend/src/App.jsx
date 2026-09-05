import { useState } from "react";
import IronManAvatar from "./components/Avatar/IronManAvatar";
import ChatPanel from "./components/Chat/ChatPanel";
import SessionSidebar from "./components/Sidebar/SessionSidebar";
import { useChat } from "./hooks/useChat";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    messages,
    emotion,
    isThinking,
    isStreaming,
    error,
    voiceState,
    sessions,
    currentSessionId,
    switchSession,
    newSession,
    deleteSession,
    clearAllSessions,
    send,
    retry,
    stopGeneration,
    toggleVoiceInput,
  } = useChat();

  return (
    <div className="arcis-app">
      {/* Collapsible Mission Logs Sidebar */}
      <SessionSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={switchSession}
        onNewSession={newSession}
        onDeleteSession={deleteSession}
        onClearAll={clearAllSessions}
      />

      {/* Global Blueprint Grid & Scanline */}
      <div className="arcis-global-grid" />
      <div className="arcis-global-scanline" />

      {/* Dual-Panel Split Screen Container */}
      <div className="arcis-split-layout">
        {/* ================================================================
            LEFT PANEL: DEDICATED IRON MAN / STARK TECHNOLOGY VISUALIZATION
           ================================================================ */}
        <section className="arcis-left-panel" aria-label="Iron Man Holographic Interface">
          {/* Top Panel HUD Bar */}
          <div className="left-panel__hud-bar left-panel__hud-bar--top">
            <div className="hud-tag">
              <span className="hud-tag__dot" />
              <span className="hud-tag__text">STARK INDUSTRIES // MARK VII BLUEPRINT</span>
            </div>
            <div className="hud-coord">SYS-ID: MK7-85 // RECEPTORS ARMED</div>
          </div>

          {/* Center Stage: Dedicated Unobstructed Iron Man Figure & Arc Reactor */}
          <div className="left-panel__avatar-wrapper">
            <IronManAvatar
              emotion={emotion}
              isThinking={isThinking}
              isStreaming={isStreaming}
              voiceState={voiceState}
            />
          </div>

          {/* Bottom Panel HUD Bar */}
          <div className="left-panel__hud-bar left-panel__hud-bar--bottom">
            <div className="hud-status-indicator">
              <span className="hud-status-indicator__pulse" />
              <span>ARC REACTOR CORE: 100% FLUX STABILIZED</span>
            </div>
            <div className="hud-spec">TACTICAL HUD // LIVE TELEMETRY</div>
          </div>
        </section>

        {/* Vertical Holographic Divider */}
        <div className="arcis-split-divider">
          <span className="divider-glow-notch" />
        </div>

        {/* ================================================================
            RIGHT PANEL: DEDICATED ARCIS MARVEL AI COMMAND CENTER
           ================================================================ */}
        <section className="arcis-right-panel" aria-label="ARCIS Marvel AI Command Center">
          {/* TOP: ARCIS Header & Status */}
          <header className="arcis-command-header">
            <div className="command-header__brand">
              <div className="command-header__logo">
                <span className="command-header__logo-ring" />
                <span className="command-header__logo-core" />
              </div>
              <div className="command-header__title-group">
                <h1 className="command-header__wordmark">ARCIS</h1>
                <span className="command-header__tagline">Autonomous Reactor Core Intelligent System</span>
              </div>
            </div>

            <div className="command-header__controls">
              {/* Marvel Intelligence Status Pill */}
              <div className="intel-status-pill">
                <span className="intel-status-pill__dot" />
                <span className="intel-status-pill__text">MARVEL INTELLIGENCE ONLINE</span>
              </div>

              {/* Mission Logs History Button */}
              <button
                type="button"
                className="btn-command-action"
                onClick={() => setSidebarOpen(true)}
                title="Mission Logs & History"
                aria-label="Open Mission Logs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
                <span>Logs</span>
              </button>

              {/* New Mission Button */}
              <button
                type="button"
                className="btn-command-action btn-command-action--primary"
                onClick={newSession}
                title="Initialize New Mission"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Mission</span>
              </button>
            </div>
          </header>

          {/* MIDDLE & BOTTOM: Scrollable Chat Conversation & Anchored Input Console */}
          <div className="arcis-command-chat">
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              isStreaming={isStreaming}
              error={error}
              voiceState={voiceState}
              onSend={send}
              onRetry={retry}
              onStop={stopGeneration}
              onToggleVoice={toggleVoiceInput}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
