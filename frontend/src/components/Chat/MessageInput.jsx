import { useState } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Say something to Aura"
        disabled={disabled}
        autoFocus
        aria-label="Message"
      />
      <button type="submit" disabled={disabled || !value.trim()} aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 8h11M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
