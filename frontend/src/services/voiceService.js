/**
 * voiceService.js
 * Browser-native SpeechRecognition & SpeechSynthesis service.
 * Features automatic language/script detection and emotion-driven voice modulation.
 */

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const VoiceState = {
  IDLE: "idle",
  LISTENING: "listening",
  THINKING: "thinking",
  GENERATING: "generating",
  SPEAKING: "speaking",
  ERROR: "error",
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function detectScriptLanguage(text) {
  if (!text) return "en-US";
  // Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
  // Devanagari (Hindi/Marathi)
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  // Malayalam script
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN";
  // Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
  // Kannada script
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
  // Bengali script
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";

  // For Latin script with South Asian vocabulary / Tanglish / Hinglish, prefer en-IN voice if available
  const lower = text.toLowerCase();
  const indianMarkers = ["machaan", "enna", "romba", "aachu", "da", "bhai", "kya", "yaar", "theek", "nalla", "bro"];
  if (indianMarkers.some((m) => lower.includes(m))) {
    return "en-IN";
  }

  return "en-US";
}

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.state = VoiceState.IDLE;
    this.onStateChange = null;
    this.onTranscript = null;
    this.onError = null;
    this.currentUtterance = null;
    this._initRecognition();
  }

  _initRecognition() {
    if (!SpeechRecognition) return;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this._setState(VoiceState.LISTENING);
      };

      this.recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (this.onTranscript) {
          this.onTranscript(transcript, event.results[0].isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error !== "no-speech") {
          console.warn("[voiceService] Speech recognition warning:", event.error);
          this._setState(VoiceState.ERROR);
          if (this.onError) this.onError(event.error);
        }
        this._setState(VoiceState.IDLE);
      };

      this.recognition.onend = () => {
        if (this.state === VoiceState.LISTENING) {
          this._setState(VoiceState.IDLE);
        }
      };
    } catch (e) {
      console.warn("[voiceService] SpeechRecognition init failed:", e);
    }
  }

  _setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) this.onStateChange(newState);
    }
  }

  startListening(onTranscript, onError) {
    if (!this.recognition) {
      if (onError) onError("Speech recognition is not supported in this browser.");
      return;
    }
    this.stopSpeaking();
    this.onTranscript = onTranscript;
    this.onError = onError;
    try {
      this.recognition.start();
    } catch {
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition?.start(), 100);
      } catch {
        // Ignore restart error
      }
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore stop error
      }
    }
    if (this.state === VoiceState.LISTENING) {
      this._setState(VoiceState.IDLE);
    }
  }

  speak(text, emotion = null, onEnd = null) {
    if (!this.synthesis || !text) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    // Clean markdown, brackets, and emojis for smooth TTS
    const cleanText = text
      .replace(/<!--EMOTION:.*?-->/g, "")
      .replace(/[*_~`#>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    const detectedLang = detectScriptLanguage(cleanText);
    utterance.lang = detectedLang;

    // Pick best matching voice if available
    const voices = this.synthesis.getVoices() || [];
    const matchedVoice =
      voices.find((v) => v.lang === detectedLang) ||
      voices.find((v) => v.lang.startsWith(detectedLang.split("-")[0])) ||
      voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en-US"));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Emotion-reactive modulation
    let rate = 1.0;
    let pitch = 1.0;

    if (emotion) {
      const valence = emotion.valence ?? 0.0;
      const arousal = emotion.arousal ?? 0.2;
      const label = emotion.label ?? "neutral";

      if (label === "excited" || (valence > 0.4 && arousal > 0.5)) {
        // Higher energy, slightly faster speech, more expressive
        rate = 1.08;
        pitch = 1.06;
      } else if (label === "happy" || valence > 0.3) {
        rate = 1.04;
        pitch = 1.04;
      } else if (label === "sad" || valence < -0.3) {
        // Calmer, gentler delivery, slightly slower
        rate = 0.92;
        pitch = 0.95;
      } else if (label === "frustrated" || label === "anxious") {
        // Controlled, supportive, calming presence
        rate = 0.95;
        pitch = 1.0;
      } else {
        // Neutral / Calm
        rate = 1.0;
        pitch = 1.0;
      }

      // Safe bounds to maintain natural human quality
      rate = clamp(rate, 0.88, 1.15);
      pitch = clamp(pitch, 0.9, 1.12);
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      this._setState(VoiceState.SPEAKING);
    };

    utterance.onend = () => {
      if (this.state === VoiceState.SPEAKING) {
        this._setState(VoiceState.IDLE);
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("[voiceService] Speech synthesis issue:", e);
      if (this.state === VoiceState.SPEAKING) {
        this._setState(VoiceState.IDLE);
      }
      if (onEnd) onEnd();
    };

    try {
      this.synthesis.speak(utterance);
    } catch (e) {
      console.warn("[voiceService] speak failed:", e);
      this._setState(VoiceState.IDLE);
      if (onEnd) onEnd();
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch {
        // Ignore cancel error
      }
    }
    if (this.state === VoiceState.SPEAKING) {
      this._setState(VoiceState.IDLE);
    }
  }
}

export const voiceService = new VoiceService();
