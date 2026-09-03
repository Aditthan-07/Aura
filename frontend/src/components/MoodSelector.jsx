import { MOODS } from "../constants/moods";

export default function MoodSelector({ activeMood, onSelectMood, disabled }) {
  return (
    <div className="mood-selector" role="region" aria-label="Preset Mood Testing Mode">
      <div className="mood-selector__header">
        <span className="mood-selector__title">Persona Mood</span>
        <span className="mood-selector__hint">Testing Mode</span>
      </div>
      <div className="mood-selector__chips">
        {MOODS.map((m) => {
          const isActive = activeMood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`mood-chip ${isActive ? "mood-chip--active" : ""}`}
              onClick={() => onSelectMood(m.id)}
              disabled={disabled}
              title={`${m.label}: ${m.desc}`}
            >
              <span className="mood-chip__emoji">{m.emoji}</span>
              <span className="mood-chip__label">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
