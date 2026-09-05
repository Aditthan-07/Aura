import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Marvel Quick Directives
const QUICK_DIRECTIVES = [
  { label: "⚡ Stark Tech Breakdown", prompt: "Give me a detailed engineering breakdown of Tony Stark's Mark 85 nanotechnology suit." },
  { label: "🌌 Multiverse Timeline", prompt: "Explain the MCU Multiverse timeline structure, Sacred Timeline, and how the TVA handles branching." },
  { label: "🛡️ Vibranium vs Adamantium", prompt: "Compare Vibranium and Adamantium: origins, molecular density, kinetic absorption, and durability." },
  { label: "🎬 MCU Phase Guide", prompt: "Provide a structured roadmap of MCU Phase 5 and Phase 6 with key upcoming events." },
  { label: "🦾 Iron Man Suit Evolution", prompt: "Trace the major evolutionary milestones of Iron Man armors from Mark 1 to Mark 85." },
  { label: "💎 Infinity Stones", prompt: "Break down the 6 Infinity Stones: their cosmic origins, powers, and where they currently reside across timelines." },
  { label: "🧠 Character Analysis", prompt: "Provide an in-depth tactical and psychological analysis of Tony Stark / Iron Man." },
];

function cleanMessageContent(content) {
  if (!content) return "";
  return content
    .replace(/<!--EMOTION[\s\S]*?(-->|$)/gi, "")
    .replace(/<!--[\s\S]*?(-->|$)/gi, "")
    .replace(/<!--.*$/gis, "")
    .trim();
}

/**
 * Clean Stark HUD Markdown Formatter for ARCIS
 */
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = [];
  let listType = null;

  const flushList = (key) => {
    if (currentList.length > 0) {
      if (listType === "ol") {
        elements.push(
          <ol key={`ol_${key}`} className="arcis-msg-ol">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul_${key}`} className="arcis-msg-ul">
            {currentList.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const renderInline = (str) => {
    return str
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code class='arcis-inline-code'>$1</code>");
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(index);
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList(index);
      elements.push(
        <h4 key={index} className="arcis-msg-h3" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(4)) }} />
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(index);
      elements.push(
        <h3 key={index} className="arcis-msg-h2" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(3)) }} />
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushList(index);
      elements.push(
        <h2 key={index} className="arcis-msg-h1" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(2)) }} />
      );
      return;
    }

    // Unordered List (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType && listType !== "ul") flushList(index);
      listType = "ul";
      currentList.push(ulMatch[1]);
      return;
    }

    // Ordered List (1., 2., etc.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listType && listType !== "ol") flushList(index);
      listType = "ol";
      currentList.push(olMatch[1]);
      return;
    }

    // Paragraph
    flushList(index);
    elements.push(
      <p key={index} className="arcis-msg-p" dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
    );
  });

  flushList(lines.length);
  return <div className="arcis-formatted-text">{elements}</div>;
}

export default function MessageList({ messages, isThinking, isStreaming, onSelectDirective }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking, isStreaming]);

  return (
    <div className="message-list">
      {/* Clean, Elegant Opening Introduction */}
      {messages.length === 0 && (
        <div className="arcis-intro-panel">
          <div className="arcis-intro-badge">
            <span className="arcis-badge-pulse" />
            <span>STARK PROTOCOL // MARVEL INTEL</span>
          </div>

          <div className="arcis-intro-greeting">
            <h2 className="greeting-lead">Hello ……</h2>
            <p className="greeting-sub">
              Protocol ARCIS initiated. Ready to explore the Marvel Universe? Whether it&apos;s Stark Tech schematics, Multiverse timeline analysis, or deep comic lore — fire away!
            </p>
          </div>

          <div className="arcis-directives-section">
            <div className="directives-meta">
              <span className="directives-label">TACTICAL DIRECTIVES</span>
              <span className="directives-line" />
            </div>

            <div className="arcis-directives-row">
              {QUICK_DIRECTIVES.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="hud-directive-chip"
                  onClick={() => onSelectDirective && onSelectDirective(d.prompt)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversation Messages */}
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => {
          const isLatestAssistant =
            i === messages.length - 1 && msg.role === "assistant" && isStreaming;
          const displayContent = cleanMessageContent(msg.content);

          if (!displayContent && !isLatestAssistant) {
            return null;
          }

          return (
            <motion.div
              key={msg.id || `msg_${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`message message--${msg.role}`}
            >
              {msg.role === "assistant" && (
                <div className="message__intel-tag">
                  <span className="intel-tag-icon">⚡</span>
                  <span>ARCIS INTEL</span>
                </div>
              )}
              <FormattedMessage text={displayContent} />
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
            <div className="message__intel-tag">
              <span className="intel-tag-icon">⚡</span>
              <span>COMPUTING QUANTUM TELEMETRY</span>
            </div>
            <div className="thinking-dots-row">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
