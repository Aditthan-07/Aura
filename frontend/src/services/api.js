/**
 * api.js
 * Frontend HTTP & SSE streaming client for Aura chat API.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(message, status = 500, isRateLimit = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isRateLimit = isRateLimit || status === 429;
  }
}

export async function sendMessage(message, history, mood = "neutral", signal = null) {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, mood }),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = body.detail ?? "Something went wrong reaching Aura.";
      throw new ApiError(detail, response.status, response.status === 429);
    }

    return response.json(); // { reply, emotion }
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      "Network connection interrupted. Please check your connection.",
      0
    );
  }
}

export async function sendMessageStream({
  message,
  history,
  mood = "neutral",
  signal = null,
  onChunk,
  onEmotion,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, mood }),
      signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = body.detail ?? "Failed to initialize response stream.";
      const error = new ApiError(detail, response.status, response.status === 429);
      if (onError) onError(error);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        try {
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          const data = JSON.parse(jsonStr);

          if (data.type === "chunk" && data.content && onChunk) {
            onChunk(data.content);
          } else if (data.type === "emotion" && data.emotion && onEmotion) {
            onEmotion(data.emotion);
          } else if (data.type === "done" && onDone) {
            onDone();
          } else if (data.type === "error") {
            const err = new ApiError(data.error || "Streaming error", 500);
            if (onError) onError(err);
          }
        } catch (parseErr) {
          console.warn("[api.js] SSE chunk parse error:", parseErr, trimmed);
        }
      }
    }

    if (onDone) onDone();
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("[api.js] Request cancelled by user.");
      if (onDone) onDone();
      return;
    }
    const apiErr =
      err instanceof ApiError
        ? err
        : new ApiError("Network connection interrupted. Please try again.", 0);
    if (onError) onError(apiErr);
  }
}
