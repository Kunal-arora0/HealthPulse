/**
 * Web Audio API Synthesizer for Gym Countdown & Set Completion Chimes
 * Zero external mp3 dependencies - purely synthesized in Vanilla JS!
 */

class AudioService {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
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

  // 3-2-1 countdown tick
  playTick() {
    this.playBeep(880, 80);
  }
}

export const soundFx = new AudioService();
