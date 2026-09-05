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
  isOpen,
  onClose,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
}) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`session-sidebar ${isOpen ? "session-sidebar--open" : ""}`} aria-hidden={!isOpen}>
        <div className="session-sidebar__header">
          <div className="sidebar-header__title">
            <h3>Conversations</h3>
            <span className="sidebar-header__count">{sessions.length}</span>
          </div>
          <div className="sidebar-header__actions">
            <button
              type="button"
              className="btn-sidebar-new"
              onClick={() => {
                onNewSession();
                onClose();
              }}
              title="Start New Chat"
            >
              + New
            </button>
            <button
              type="button"
              className="btn-sidebar-close"
              onClick={onClose}
              title="Close Sidebar"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
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
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSelectSession(s.id);
                      onClose();
                    }
                  }}
                >
                  <div className="session-item__content">
                    <span className="session-item__title">{s.title || "New Conversation"}</span>
                    <span className="session-item__meta">
                      {formatTimestamp(s.updatedAt || s.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="session-item__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    title="Delete Conversation"
                    aria-label="Delete"
                  >
                    🗑
                  </button>
                </div>
              );
            })
          )}
        </div>

        {sessions.length > 1 && (
          <div className="session-sidebar__footer">
            <button
              type="button"
              className="btn-clear-all"
              onClick={() => {
                if (window.confirm("Clear all conversation history?")) {
                  onClearAll();
                  onClose();
                }
              }}
            >
              Clear All Conversations
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
