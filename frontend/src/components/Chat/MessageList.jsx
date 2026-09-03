import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MessageList({ messages, isThinking, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking, isStreaming]);

  return (
    <div className="message-list">
      {messages.length === 0 && !isThinking && (
        <div className="message-list__empty">
          <p>Aura is ready. Share a thought, feeling, or question.</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg, i) => {
          const isLatestAssistant =
            i === messages.length - 1 && msg.role === "assistant" && isStreaming;

          return (
            <motion.div
              key={msg.id || `msg_${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`message message--${msg.role}`}
            >
              {msg.content}
              {isLatestAssistant && <span className="streaming-cursor">▍</span>}
            </motion.div>
          );
        })}

        {isThinking && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="message message--assistant message--thinking"
          >
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
