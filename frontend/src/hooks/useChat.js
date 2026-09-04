/**
 * useChat.js
 * Enhanced chat state management with clean refresh handling, multi-session persistence,
 * in-flight request protection, voice-reactive integration, and non-destructive retry handling.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessageStream } from "../services/api";
import { chatStorage } from "../services/chatStorage";
import { voiceService, VoiceState } from "../services/voiceService";

export function useChat() {
  const [sessions, setSessions] = useState(() => chatStorage.getSessions());
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = chatStorage.getActiveSessionId();
    const existing = chatStorage.getSession(saved);

    // If existing session is valid and has complete conversation, load it
    // If it only has unanswered/failed messages, start a fresh session on reload
    if (existing && existing.messages && existing.messages.length > 0) {
      const hasAssistantReply = existing.messages.some((m) => m.role === "assistant" && m.content);
      if (hasAssistantReply) {
        return existing.id;
      }
    }

    const freshSession = chatStorage.createSession();
    return freshSession.id;
  });

  const activeSession = chatStorage.getSession(currentSessionId) || null;

  const [messages, setMessages] = useState(() => activeSession?.messages || []);
  const [emotion, setEmotion] = useState(() => activeSession?.emotion || { label: "calm", valence: 0.0, arousal: 0.18 });
  const [activeMood, setActiveMood] = useState(() => activeSession?.activeMood || chatStorage.getSavedMood());
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [voiceState, setVoiceState] = useState(VoiceState.IDLE);

  const abortControllerRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastUserMessageRef = useRef("");

  // Sync voice service state
  useEffect(() => {
    voiceService.onStateChange = (state) => {
      setVoiceState(state);
    };
    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, []);

  // Save session updates to storage on changes
  useEffect(() => {
    if (!currentSessionId) return;
    const current = chatStorage.getSession(currentSessionId) || {
      id: currentSessionId,
      title: "New Conversation",
      createdAt: Date.now(),
    };

    const updated = {
      ...current,
      messages,
      emotion,
      activeMood,
      updatedAt: Date.now(),
    };

    chatStorage.saveSession(updated);
  }, [messages, emotion, activeMood, currentSessionId]);

  // Switch session
  const switchSession = useCallback((sessionId) => {
    if (inFlightRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const target = chatStorage.getSession(sessionId);
    if (!target) return;

    chatStorage.setActiveSessionId(sessionId);
    setCurrentSessionId(sessionId);
    setMessages(target.messages || []);
    setEmotion(target.emotion || { label: "calm", valence: 0.0, arousal: 0.18 });
    setActiveMood(target.activeMood || "neutral");
    setError(null);
    setIsThinking(false);
    setIsStreaming(false);
    inFlightRef.current = false;
    setSessions(chatStorage.getSessions());
  }, []);

  // Create new session
  const newSession = useCallback(() => {
    if (inFlightRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const created = chatStorage.createSession("", activeMood);
    setSessions(chatStorage.getSessions());
    setCurrentSessionId(created.id);
    setMessages([]);
    setEmotion({ label: "calm", valence: 0.0, arousal: 0.18 });
    setError(null);
    setIsThinking(false);
    setIsStreaming(false);
    inFlightRef.current = false;
  }, [activeMood]);

  // Delete session
  const deleteSession = useCallback(
    (sessionId) => {
      const remaining = chatStorage.deleteSession(sessionId);
      setSessions(remaining);
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          switchSession(remaining[0].id);
        } else {
          newSession();
        }
      }
    },
    [currentSessionId, switchSession, newSession]
  );

  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    if (inFlightRef.current && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    chatStorage.clearAllSessions();
    newSession();
  }, [newSession]);

  // Set mood dynamically
  const selectMood = useCallback((mood) => {
    setActiveMood(mood);
    chatStorage.setSavedMood(mood);
    setSessions(chatStorage.getSessions());
  }, []);

  // Stop streaming generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setIsStreaming(false);
    inFlightRef.current = false;
    setSessions(chatStorage.getSessions());
  }, []);

  // Send message
  const send = useCallback(
    async (text, autoSpeak = false) => {
      const trimmed = (text || "").trim();
      if (!trimmed || inFlightRef.current) return;

      lastUserMessageRef.current = trimmed;
      setError(null);
      inFlightRef.current = true;
      setIsThinking(true);
      setIsStreaming(false);

      const userMessage = {
        id: "msg_" + Date.now().toString(36) + "_u",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      const historyForApi = messages.map(({ role, content }) => ({ role, content }));
      setMessages((prev) => [...prev, userMessage]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let accumulatedAssistantText = "";
      const assistantMessageId = "msg_" + (Date.now() + 1).toString(36) + "_a";

      try {
        await sendMessageStream({
          message: trimmed,
          history: historyForApi,
          mood: activeMood,
          signal: controller.signal,
          onChunk: (chunk) => {
            setIsThinking(false);
            setIsStreaming(true);
            accumulatedAssistantText += chunk;

            const safeVisibleText = accumulatedAssistantText
              .replace(/<!--EMOTION[\s\S]*?(-->|$)/gi, "")
              .replace(/<!--[\s\S]*?(-->|$)/gi, "")
              .replace(/<!--.*$/gis, "");

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.id === assistantMessageId) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: safeVisibleText },
                ];
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: safeVisibleText,
                  timestamp: Date.now(),
                },
              ];
            });
          },
          onEmotion: (newEmotion) => {
            if (newEmotion) {
              setEmotion(newEmotion);
            }
          },
          onDone: () => {
            setIsThinking(false);
            setIsStreaming(false);
            inFlightRef.current = false;
            abortControllerRef.current = null;

            const finalSafeText = accumulatedAssistantText
              .replace(/<!--EMOTION[\s\S]*?(-->|$)/gi, "")
              .replace(/<!--[\s\S]*?(-->|$)/gi, "")
              .replace(/<!--.*$/gis, "")
              .trim();

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.id === assistantMessageId) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: finalSafeText },
                ];
              }
              return prev;
            });

            setSessions(chatStorage.getSessions());

            if (autoSpeak && finalSafeText) {
              voiceService.speak(finalSafeText, emotion);
            }
          },
          onError: (err) => {
            setIsThinking(false);
            setIsStreaming(false);
            inFlightRef.current = false;
            abortControllerRef.current = null;
            setSessions(chatStorage.getSessions());

            const isRateLimit = err?.isRateLimit || err?.status === 429;
            const message =
              err?.message ||
              (isRateLimit
                ? "The AI service is temporarily rate-limited. Retrying shortly..."
                : "Unable to reach Aura. Your conversation is preserved.");

            setError({ message, isRateLimit });
          },
        });
      } catch (err) {
        setIsThinking(false);
        setIsStreaming(false);
        inFlightRef.current = false;
        abortControllerRef.current = null;
        setSessions(chatStorage.getSessions());

        if (err.name !== "AbortError") {
          setError({
            message: "Connection interrupted. Your conversation is preserved.",
            isRateLimit: false,
          });
        }
      }
    },
    [messages, activeMood, emotion]
  );

  // Retry last user message
  const retry = useCallback(() => {
    if (!lastUserMessageRef.current) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && !last.content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    send(lastUserMessageRef.current);
  }, [send]);

  // Voice toggle
  const toggleVoiceInput = useCallback(() => {
    if (voiceState === VoiceState.LISTENING) {
      voiceService.stopListening();
    } else {
      voiceService.startListening(
        (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            send(transcript.trim(), true);
          }
        },
        (err) => {
          setError({ message: `Voice error: ${err}`, isRateLimit: false });
        }
      );
    }
  }, [voiceState, send]);

  return {
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
  };
}
