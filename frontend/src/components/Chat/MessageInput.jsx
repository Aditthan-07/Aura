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
    <form className="message-input" onSubmit={handleSubmit}>
      <button
        type="button"
        className={`btn-voice ${isListening ? "btn-voice--active" : ""}`}
        onClick={onToggleVoice}
        title={isListening ? "Listening... (Click to stop)" : "Speak to Aura"}
        aria-label="Voice input"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isListening ? "Listening to your voice..." : "Say something to Aura..."}
        disabled={disabled || isListening}
        autoFocus
        aria-label="Message"
      />

      {isGenerating ? (
        <button
          type="button"
          className="btn-stop"
          onClick={onStop}
          title="Stop Generating"
          aria-label="Stop Generating"
        >
          <span className="stop-square" />
        </button>
      ) : (
        <button type="submit" disabled={disabled || !value.trim()} aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8h11M8 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </form>
  );
}
