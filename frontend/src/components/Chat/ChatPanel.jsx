import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatPanel({ messages, isThinking, error, onSend }) {
  return (
    <div className="chat-panel">
      {messages.length === 0 && !isThinking && (
        <div className="chat-panel__empty">
          The orb is listening. Say hello — its color and motion will shift with the conversation.
        </div>
      )}
      <MessageList messages={messages} isThinking={isThinking} />
      {error && <div className="chat-panel__error">{error}</div>}
      <MessageInput onSend={onSend} disabled={isThinking} />
    </div>
  );
}
