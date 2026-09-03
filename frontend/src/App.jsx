import AuraOrb from "./components/Avatar/AuraOrb";
import ChatPanel from "./components/Chat/ChatPanel";
import EmotionReadout from "./components/EmotionReadout";
import SessionSidebar from "./components/Sidebar/SessionSidebar";
import { useChat } from "./hooks/useChat";

export default function App() {
  const {
    messages,
    emotion,
    activeMood,
    selectMood,
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

      <header className="app__header">
        <span className="app__wordmark">aura</span>
        <span className="app__tagline">an emotionally expressive companion</span>
      </header>

      <EmotionReadout emotion={emotion} />

      <div className="app__chat-layer">
        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          isStreaming={isStreaming}
          error={error}
          activeMood={activeMood}
          onSelectMood={selectMood}
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
