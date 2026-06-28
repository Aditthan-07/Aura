const LABEL_COPY = {
  calm: "calm",
  curious: "curious",
  happy: "happy",
  excited: "excited",
  sad: "low",
  anxious: "uneasy",
  frustrated: "frustrated",
  neutral: "neutral",
};

export default function EmotionReadout({ emotion }) {
  if (!emotion) {
    return <div className="emotion-readout emotion-readout--idle">awaiting first signal</div>;
  }

  const sign = (n) => (n >= 0 ? "+" : "");

  return (
    <div className="emotion-readout">
      <span className="emotion-readout__label">{LABEL_COPY[emotion.label] ?? emotion.label}</span>
      <span className="emotion-readout__divider">·</span>
      <span>valence {sign(emotion.valence)}{emotion.valence.toFixed(2)}</span>
      <span className="emotion-readout__divider">·</span>
      <span>arousal {emotion.arousal.toFixed(2)}</span>
    </div>
  );
}
