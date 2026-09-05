import { useState } from "react";

export default function MessageInput({
  onSend,
  onStop,
  onToggleVoice,
  isGenerating,
  voiceState,
  disabled,
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || isGenerating || disabled) return;
    onSend(value);
    setValue("");
  };

  const isListening = voiceState === "listening";

  return (
    <div className="arcis-console-wrapper">
      <form className="arcis-console-form" onSubmit={handleSubmit}>
        {/* Vocal Receptor / Mic Button */}
        <button
          type="button"
          className={`btn-console-voice ${isListening ? "btn-console-voice--active" : ""}`}
          onClick={onToggleVoice}
          title={isListening ? "Listening... (Click to stop)" : "Vocal Receptor // Speak to ARCIS"}
          aria-label="Vocal input"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* Command Line Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isListening ? "Vocal receptor active... Speak now..." : "Ask ARCIS about the Marvel Universe..."}
          disabled={disabled || isListening}
          autoFocus
          aria-label="Command Input"
          className="console-text-input"
        />

        {/* Action Button: Stop or Send */}
        {isGenerating ? (
          <button
            type="button"
            className="btn-console-stop"
            onClick={onStop}
            title="Stop Transmission"
            aria-label="Stop Transmission"
          >
            <span className="stop-square" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Transmit"
            className="btn-console-send"
            title="Transmit Directive"
          >
            <span className="send-arrow">➤</span>
          </button>
        )}
      </form>
    </div>
  );
}
