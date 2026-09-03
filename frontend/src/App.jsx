import { useState } from "react";
import AuraOrb from "./components/Avatar/AuraOrb";
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
    <div className="app">
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

      <div className="app__orb-layer">
        <AuraOrb
          emotion={emotion}
          isThinking={isThinking}
          isStreaming={isStreaming}
          voiceState={voiceState}
        />
      </div>

      <header className="app__navbar">
        <div className="navbar__left">
          <button
            type="button"
            className="navbar__btn-history"
            onClick={() => setSidebarOpen(true)}
            title="Conversation History"
            aria-label="Open History"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <div className="navbar__brand">
            <span className="navbar__wordmark">aura</span>
            <span className="navbar__pulse-dot" title="Aura Ready" />
          </div>
        </div>

        <div className="navbar__right">
          <button
            type="button"
            className="navbar__btn-new-chat"
            onClick={newSession}
            title="Start a fresh conversation"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </header>

      <div className="app__chat-layer">
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
    </div>
  );
}
