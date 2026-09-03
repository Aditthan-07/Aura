import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import MoodSelector from "../MoodSelector";

export default function ChatPanel({
  messages,
  isThinking,
  isStreaming,
  error,
  activeMood,
  onSelectMood,
  voiceState,
  onSend,
  onRetry,
  onStop,
  onToggleVoice,
}) {
  return (
    <div className="chat-panel">
      <MoodSelector
        activeMood={activeMood}
        onSelectMood={onSelectMood}
        disabled={isThinking || isStreaming}
      />

      <MessageList
        messages={messages}
        isThinking={isThinking}
        isStreaming={isStreaming}
      />

      {error && (
        <div className="chat-panel__error-banner" role="alert">
          <div className="error-banner__icon">
            {error.isRateLimit ? "⏳" : "⚠️"}
          </div>
          <div className="error-banner__content">
            <span className="error-banner__text">{error.message || String(error)}</span>
            <button
              type="button"
              className="error-banner__retry-btn"
              onClick={onRetry}
            >
              Retry Message
            </button>
          </div>
        </div>
      )}

      <MessageInput
        onSend={onSend}
        onStop={onStop}
        onToggleVoice={onToggleVoice}
        isGenerating={isThinking || isStreaming}
        voiceState={voiceState}
        disabled={false}
      />
    </div>
  );
}
