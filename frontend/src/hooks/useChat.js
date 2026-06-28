import { useCallback, useState } from "react";
import { sendMessage, ApiError } from "../services/api";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [emotion, setEmotion] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      setError(null);
      const userMessage = { role: "user", content: trimmed };
      const historyForRequest = messages.map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMessage]);
      setIsThinking(true);

      try {
        const { reply, emotion: newEmotion } = await sendMessage(trimmed, historyForRequest);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setEmotion(newEmotion);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Couldn't reach the server.";
        setError(message);
      } finally {
        setIsThinking(false);
      }
    },
    [messages, isThinking]
  );

  return { messages, emotion, isThinking, error, send };
}
