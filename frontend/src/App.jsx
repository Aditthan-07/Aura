import AuraOrb from "./components/Avatar/AuraOrb";
import ChatPanel from "./components/Chat/ChatPanel";
import EmotionReadout from "./components/EmotionReadout";
import { useChat } from "./hooks/useChat";

export default function App() {
  const { messages, emotion, isThinking, error, send } = useChat();

  return (
    <div className="app">
      <div className="app__orb-layer">
        <AuraOrb emotion={emotion} isThinking={isThinking} />
      </div>

      <header className="app__header">
        <span className="app__wordmark">aura</span>
        <span className="app__tagline">a companion that shows its mood</span>
      </header>

      <EmotionReadout emotion={emotion} />

      <div className="app__chat-layer">
        <ChatPanel messages={messages} isThinking={isThinking} error={error} onSend={send} />
      </div>
    </div>
  );
}
