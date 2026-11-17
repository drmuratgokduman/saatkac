// ============================================
// ZAMAN KAŞİFİ — Ses Sentez Motoru
// audio.js — Web Audio API
// ============================================

/**
 * Web Audio API ile tamamen sentetik ses efektleri.
 * Harici ses dosyası gerektirmez.
 */
class AudioEngine {

  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  /**
   * AudioContext'i kullanıcı etkileşiminden sonra başlatır
   * (Tarayıcı autoplay politikası gereği)
   */
  _ensureContext() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        // Web Audio desteklenmiyorsa sessizce devam et
        return null;
      }
    }
    // Suspended ise resume et
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Çark tıklama sesi — kısa, keskin tık
   */
  playTick() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Kısa beyaz gürültü burst
    const bufferSize = ctx.sampleRate * 0.02; // 20ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter - tık sesini daha mekanik yapar
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + 0.03);
  }

  /**
   * Doğru cevap — ksilofon tarzı yükselen 4 nota (C5-E5-G5-C6)
   */
  playCorrect() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle'; // Ksilofon benzeri yumuşak ton
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * Yanlış cevap — kısa düşük frekanslı buzz
   */
  playWrong() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Low-pass filtre ile sertliği azalt
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  /**
   * Kutlama / ödül sesi — kısa fanfar
   */
  playCelebration() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1046.50]; 
    // C5, E5, G5, C6, E6, C6
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      // Hafif reverb hissi için delay
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }
}
