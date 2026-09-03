/**
 * voiceService.js
 * Browser-native SpeechRecognition & SpeechSynthesis service with emotion-reactive modulation.
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
        console.warn("[voiceService] Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
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
      console.warn("[voiceService] Could not initialize speech recognition:", e);
    }
  }

  isSpeechRecognitionSupported() {
    return !!SpeechRecognition;
  }

  isSpeechSynthesisSupported() {
    return !!this.synthesis;
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
      // If already started, restart
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

    // Clean markdown/special characters for speech
    const cleanText = text
      .replace(/[*_~`#>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Emotion-reactive modulation
    let rate = 1.0;
    let pitch = 1.0;

    if (emotion) {
      const valence = emotion.valence ?? 0;
      const arousal = emotion.arousal ?? 0.2;

      // Positive valence/high arousal -> slightly faster & brighter pitch
      rate = THREE_Math_clamp(1.0 + arousal * 0.25 - (valence < 0 ? 0.15 : 0), 0.8, 1.3);
      pitch = THREE_Math_clamp(1.0 + valence * 0.2 + arousal * 0.15, 0.8, 1.3);
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
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (this.state === VoiceState.SPEAKING) {
        this._setState(VoiceState.IDLE);
      }
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
    if (this.state === VoiceState.SPEAKING) {
      this._setState(VoiceState.IDLE);
    }
  }

  _setState(newState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }
}

function THREE_Math_clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export const voiceService = new VoiceService();
