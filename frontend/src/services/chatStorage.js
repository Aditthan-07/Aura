/**
 * chatStorage.js
 * Persistent chat history management backed by localStorage.
 * Supports multi-session management, auto-titling, timestamps, and error recovery.
 */

const STORAGE_KEYS = {
  SESSIONS: "arcis_chat_sessions_v2",
  ACTIVE_SESSION_ID: "arcis_active_session_id_v2",
  SAVED_MOOD: "arcis_saved_mood_v2",
};

function generateId() {
  return "session_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
}

function truncateTitle(text, maxLength = 32) {
  const clean = (text || "").trim().replace(/[\r\n]+/g, " ");
  if (clean.length <= maxLength) return clean || "New Conversation";
  return clean.substring(0, maxLength) + "...";
}

export const chatStorage = {
  getSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("[chatStorage] Failed to read sessions from localStorage:", e);
      return [];
    }
  },

  getSession(id) {
    const sessions = this.getSessions();
    return sessions.find((s) => s.id === id) || null;
  },

  createSession(initialMessage = "", activeMood = "neutral") {
    const newSession = {
      id: generateId(),
      title: initialMessage ? truncateTitle(initialMessage) : "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      activeMood: activeMood || "neutral",
      emotion: { label: "calm", valence: 0.0, arousal: 0.18 },
    };

    const sessions = this.getSessions();
    sessions.unshift(newSession);
    this._persistSessions(sessions);
    this.setActiveSessionId(newSession.id);
    return newSession;
  },

  saveSession(session) {
    if (!session || !session.id) return;
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);

    const updatedSession = {
      ...session,
      updatedAt: Date.now(),
      // Generate title from first user message if title is still default
      title:
        session.title === "New Conversation" && session.messages?.length > 0
          ? truncateTitle(session.messages.find((m) => m.role === "user")?.content || session.title)
          : session.title,
    };

    if (index >= 0) {
      sessions[index] = updatedSession;
    } else {
      sessions.unshift(updatedSession);
    }
    this._persistSessions(sessions);
  },

  deleteSession(id) {
    let sessions = this.getSessions();
    sessions = sessions.filter((s) => s.id !== id);
    this._persistSessions(sessions);

    if (this.getActiveSessionId() === id) {
      const nextActive = sessions.length > 0 ? sessions[0].id : null;
      this.setActiveSessionId(nextActive);
    }
    return sessions;
  },

  clearAllSessions() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    } catch (e) {
      console.warn("[chatStorage] Failed to clear localStorage:", e);
    }
  },

  getActiveSessionId() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    } catch {
      return null;
    }
  },

  setActiveSessionId(id) {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      }
    } catch (e) {
      console.warn("[chatStorage] Failed to set active session ID:", e);
    }
  },

  getSavedMood() {
    try {
      return localStorage.getItem(STORAGE_KEYS.SAVED_MOOD) || "neutral";
    } catch {
      return "neutral";
    }
  },

  setSavedMood(mood) {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_MOOD, mood);
    } catch (e) {
      console.warn("[chatStorage] Failed to save mood:", e);
    }
  },

  _persistSessions(sessions) {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn("[chatStorage] Failed to persist sessions to localStorage:", e);
    }
  },
};
