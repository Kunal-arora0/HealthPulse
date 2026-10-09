/**
 * Web Audio API Synthesizer for Gym Countdown & Set Completion Chimes
 * Zero external mp3 dependencies - purely synthesized in Vanilla JS!
 */

class AudioService {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playBeep(frequency = 600, durationMs = 120, type = 'sine') {
    try {
      this.init();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + (durationMs / 1000));
    } catch (err) {
      console.warn('Audio play failed:', err);
    }
  }

  // Chime when rest timer reaches 0
  playCompletionChime() {
    this.playBeep(523.25, 100); // C5
    setTimeout(() => this.playBeep(659.25, 100), 120); // E5
    setTimeout(() => this.playBeep(783.99, 300), 240); // G5
  }

  // Pleasant success chime for logging food or completing actions
  playSuccess() {
    try {
      this.playBeep(587.33, 90); // D5
      setTimeout(() => this.playBeep(880.00, 150), 100); // A5
    } catch (e) {
      // Audio playback errors are non-critical
    }
  }

  // Celebratory chime for PR / milestones
  playChime() {
    try {
      this.playBeep(523.25, 80);  // C5
      setTimeout(() => this.playBeep(659.25, 80), 90);  // E5
      setTimeout(() => this.playBeep(783.99, 80), 180); // G5
      setTimeout(() => this.playBeep(1046.50, 200), 270); // C6
    } catch (e) {
      // Audio playback errors are non-critical
    }
  }

  // 3-2-1 countdown tick
  playTick() {
    this.playBeep(880, 80);
  }
}

export const soundFx = new AudioService();
