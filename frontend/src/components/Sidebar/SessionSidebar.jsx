import { useState } from "react";

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffHours = (now - d) / (1000 * 60 * 60);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Close History" : "Conversation History"}
        aria-label="Toggle Conversation History"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      <aside className={`session-sidebar ${isOpen ? "session-sidebar--open" : ""}`}>
        <div className="session-sidebar__header">
          <h3>Conversations</h3>
          <button
            type="button"
            className="btn-new-chat"
            onClick={() => {
              onNewSession();
              setIsOpen(false);
            }}
          >
            + New Chat
          </button>
        </div>

        <div className="session-sidebar__list">
          {sessions.length === 0 ? (
            <div className="session-sidebar__empty">No saved conversations yet.</div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  className={`session-item ${isActive ? "session-item--active" : ""}`}
                  onClick={() => {
                    onSelectSession(s.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="session-item__info">
                    <span className="session-item__title">{s.title || "Untitled Chat"}</span>
                    <span className="session-item__time">{formatTimestamp(s.updatedAt)}</span>
                  </div>
                  <button
                    type="button"
                    className="session-item__delete"
                    title="Delete Conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        {sessions.length > 0 && (
          <div className="session-sidebar__footer">
            <button
              type="button"
              className="btn-clear-all"
              onClick={() => {
                if (window.confirm("Clear all conversation history?")) {
                  onClearAll();
                }
              }}
            >
              Clear All History
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
