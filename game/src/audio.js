// Synthesized audio only (WebAudio, no files). Starts after first user gesture.
export class AudioSys {
  constructor() {
    this.ctx = null; this.master = null; this.muted = false; this.windNodes = null;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startWind();
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }
  _noiseBuffer(dur = 0.3) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  _env(gain, t0, peak, decay) {
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  }
  shot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuffer(0.18);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const g = this.ctx.createGain(); this._env(g, t, 0.9, 0.16);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.2);
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g2 = this.ctx.createGain(); this._env(g2, t, 0.7, 0.14);
    o.connect(g2); g2.connect(this.master); o.start(t); o.stop(t + 0.15);
  }
  click() { this._blip(1200, 0.05, 0.25); }
  reload() { this._blip(500, 0.06, 0.3); setTimeout(() => this._blip(800, 0.06, 0.3), 180); }
  _blip(freq, dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = this.ctx.createGain(); this._env(g, t, vol, dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  thud() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
    const g = this.ctx.createGain(); this._env(g, t, 0.5, 0.12);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.13);
  }
  groan() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(45, t + 0.7);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const g = this.ctx.createGain(); this._env(g, t, 0.16, 0.8);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.85);
  }
  coin() { this._blip(880, 0.07, 0.3); setTimeout(() => this._blip(1320, 0.09, 0.3), 70); }
  herb() { this._blip(660, 0.1, 0.3); setTimeout(() => this._blip(990, 0.12, 0.3), 110); }
  jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._blip(f, 0.14, 0.28), i * 110)); }
  dawn() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this._blip(f, 0.4, 0.25), i * 220)); }
  startWind() {
    if (!this.ctx || this.windNodes) return;
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuffer(2); src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.045;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = this.ctx.createGain(); lg.gain.value = 0.025;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(); lfo.start();
    this.windNodes = { src, lfo };
  }
}
