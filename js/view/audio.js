// Synthesised audio: SFX, ambience and generative island music (ukulele, marimba, steel drum, soft percussion).
// Everything is generated with WebAudio at runtime, so there are no audio files to download.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function rngFrom(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Music variants: one per two zones, plus one per expedition island. */
export const MUSIC = [
  { id: 'cove', root: 60, minor: false, prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], bpm: 88, lead: 'marimba', perc: 0.6, seed: 11 },
  { id: 'meadow', root: 67, minor: false, prog: [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M']], bpm: 92, lead: 'marimba', perc: 0.7, seed: 23 },
  { id: 'lagoon', root: 62, minor: false, prog: [[9, 'm'], [5, 'M'], [0, 'M'], [7, 'M']], bpm: 96, lead: 'steel', perc: 0.8, seed: 37 },
  { id: 'hills', root: 65, minor: false, prog: [[0, 'M'], [4, 'm'], [5, 'M'], [7, 'M']], bpm: 90, lead: 'marimba', perc: 0.7, seed: 41 },
  { id: 'shrine', root: 69, minor: true, prog: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M']], bpm: 80, lead: 'bell', perc: 0.4, seed: 53 },
  { id: 'harbor', root: 63, minor: false, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], bpm: 98, lead: 'steel', perc: 0.9, seed: 67 },
  // islands
  { id: 'isl_lagoon', root: 64, minor: false, prog: [[0, 'M'], [7, 'M'], [5, 'M'], [7, 'M']], bpm: 94, lead: 'bell', perc: 0.5, seed: 71 },
  { id: 'isl_pirate', root: 62, minor: true, prog: [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']], bpm: 104, lead: 'marimba', perc: 0.9, seed: 83 },
  { id: 'isl_volcano', root: 57, minor: true, prog: [[0, 'm'], [0, 'm'], [3, 'M'], [5, 'm']], bpm: 108, lead: 'steel', perc: 1.0, seed: 97 },
  { id: 'isl_ice', root: 72, minor: false, prog: [[0, 'M'], [4, 'm'], [9, 'm'], [5, 'M']], bpm: 76, lead: 'bell', perc: 0.2, seed: 101 },
  { id: 'isl_candy', root: 67, minor: false, prog: [[0, 'M'], [9, 'm'], [2, 'm'], [7, 'M']], bpm: 106, lead: 'bell', perc: 0.6, seed: 113 },
  { id: 'isl_night', root: 60, minor: true, prog: [[0, 'm'], [5, 'm'], [8, 'M'], [7, 'M']], bpm: 72, lead: 'bell', perc: 0.15, seed: 127 },
];
export function musicIndexForZone(n) { return Math.min(5, Math.floor((Math.max(1, n) - 1) / 2)); }
export function musicIndexForIsland(id) { return { isl_coral_atoll: 6, isl_pirate_cove: 7, isl_dragon_peak: 8, isl_frostfin: 9, isl_sugar_cay: 10, isl_lantern: 11 }[id] ?? 6; }

export class AudioEngine {
  constructor() {
    this.ctx = null; this.vol = { master: 0.8, music: 0.6, sfx: 0.8 }; this.mute = { music: false, sfx: false };
    this.track = -1; this.timer = null; this.pattern = null; this.step = 0; this.nextTime = 0; this.ambience = null;
    this.reduceAudio = false; this.night = false;
  }
  get ready() { return !!this.ctx; }
  ensure() {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return false; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
      this.musicBus = c.createGain(); this.musicBus.connect(this.comp);
      this.ambBus = c.createGain(); this.ambBus.connect(this.comp);
      // gentle shared reverb for music
      this.verb = c.createConvolver(); this.verb.buffer = this._impulse(1.6, 2.6); this.verbGain = c.createGain(); this.verbGain.gain.value = 0.22; this.verb.connect(this.verbGain); this.verbGain.connect(this.comp);
      this._noise = this._noiseBuffer(2);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.mute.sfx ? 0 : this.vol.sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.mute.music ? 0 : this.vol.music * 0.8, t, 0.2);
    this.ambBus.gain.setTargetAtTime(this.mute.music ? 0 : this.vol.music * 0.5, t, 0.2);
  }
  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }
  setMute(m) { Object.assign(this.mute, m); this.applyVolumes(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  _noiseBuffer(sec) { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  _impulse(sec, decay) { const c = this.ctx, n = c.sampleRate * sec, b = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }

  /* ---------- primitives ---------- */
  _env(g, t, a, peak, d, sustain = 0) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d); }
  tone(f, t, dur, { type = 'sine', vol = 0.3, a = 0.005, bus = null, glide = 0, detune = 0, lp = 0 } = {}) {
    const c = this.ctx; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glide), t + dur); o.detune.value = detune;
    this._env(g, t, a, vol, dur);
    let node = o; if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05); return g;
  }
  noise(t, dur, { vol = 0.3, type = 'bandpass', f = 1000, q = 1, a = 0.002, bus = null, sweep = 0 } = {}) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this._noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * sweep), t + dur); fl.Q.value = q; const g = c.createGain(); this._env(g, t, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(bus || this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  now() { return this.ctx.currentTime + 0.01; }

  /* ---------- instruments ---------- */
  ukulele(f, t, vol = 0.18, bus) {
    const b = bus || this.musicBus;
    const g = this.tone(f, t, 0.9, { type: 'triangle', vol, a: 0.003, bus: b, lp: 2600 }); this.tone(f * 2, t, 0.35, { type: 'sine', vol: vol * 0.35, a: 0.002, bus: b });
    this.noise(t, 0.04, { type: 'highpass', f: 3000, vol: vol * 0.35, bus: b });
    if (this.verb) g.connect(this.verb);
  }
  marimba(f, t, vol = 0.2, bus) {
    const b = bus || this.musicBus;
    const g = this.tone(f, t, 0.55, { type: 'sine', vol, a: 0.002, bus: b }); this.tone(f * 4, t, 0.12, { type: 'sine', vol: vol * 0.38, a: 0.001, bus: b }); this.tone(f * 9.2, t, 0.04, { type: 'sine', vol: vol * 0.12, a: 0.001, bus: b });
    if (this.verb) g.connect(this.verb);
  }
  steel(f, t, vol = 0.16, bus) {
    const b = bus || this.musicBus;
    const g = this.tone(f, t, 1.1, { type: 'sine', vol, a: 0.004, bus: b });
    this.tone(f * 2.01, t, 0.8, { type: 'sine', vol: vol * 0.5, a: 0.004, bus: b }); this.tone(f * 3.02, t, 0.5, { type: 'sine', vol: vol * 0.25, a: 0.004, bus: b }); this.tone(f * 4.2, t, 0.25, { type: 'sine', vol: vol * 0.12, a: 0.004, bus: b });
    if (this.verb) g.connect(this.verb);
  }
  bell(f, t, vol = 0.14, bus) {
    const b = bus || this.musicBus;
    const g = this.tone(f, t, 1.6, { type: 'sine', vol, a: 0.003, bus: b }); this.tone(f * 2.76, t, 0.9, { type: 'sine', vol: vol * 0.3, a: 0.002, bus: b }); this.tone(f * 5.4, t, 0.35, { type: 'sine', vol: vol * 0.12, a: 0.002, bus: b });
    if (this.verb) g.connect(this.verb);
  }
  lead(kind, f, t, vol) { (this[kind === 'steel' ? 'steel' : kind === 'bell' ? 'bell' : 'marimba']).call(this, f, t, vol); }

  /* ---------- music scheduler ---------- */
  buildPattern(v) {
    const r = rngFrom(v.seed * 7919), bars = 8, steps = 8; // eighth notes
    const scale = v.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    const chordOf = ([off, q]) => { const root = v.root + off - 12; return [root, root + (q === 'm' ? 3 : 4), root + 7, root + 12]; };
    const chords = []; for (let b = 0; b < bars; b++) chords.push(chordOf(v.prog[b % 4]));
    const melody = []; let idx = 2;
    for (let b = 0; b < bars; b++) for (let s = 0; s < steps; s++) {
      const strong = s % 4 === 0; const place = strong ? r() < 0.7 : r() < 0.38 + (b % 4 === 3 ? 0.1 : 0);
      if (!place) { melody.push(null); continue; }
      idx = Math.max(0, Math.min(scale.length * 2 - 1, idx + Math.round((r() - 0.5) * 4)));
      const oct = Math.floor(idx / scale.length), deg = scale[idx % scale.length];
      melody.push(v.root + 12 + oct * 12 + deg);
    }
    // 16-step strum pattern per bar: [step, downstroke?]
    const strums = [[0, 1], [2, 0], [3, 1], [5, 0], [6, 1]].map(([s, d]) => ({ s, d }));
    return { chords, melody, strums, bars, steps, v };
  }
  setMusic(index) {
    if (!this.ensure()) return;
    if (index === this.track) return;
    this.track = index; const v = MUSIC[index] || MUSIC[0]; this.pattern = this.buildPattern(v); this.step = 0; this.nextTime = this.ctx.currentTime + 0.15;
    // fade: briefly duck the music bus then restore
    const t = this.ctx.currentTime; this.musicBus.gain.cancelScheduledValues(t); this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t); this.musicBus.gain.linearRampToValueAtTime(0.0001, t + 0.15); this.musicBus.gain.linearRampToValueAtTime(this.mute.music ? 0 : this.vol.music * 0.8, t + 1.8);
    if (!this.timer) this.timer = setInterval(() => this._pump(), 90);
    this.setAmbience(v.id === 'isl_night' ? 'night' : v.id.startsWith('isl_ice') ? 'wind' : 'sea');
  }
  stopMusic() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.track = -1; }
  _pump() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.pattern) return;
    const p = this.pattern, v = p.v, spb = 60 / v.bpm, stepDur = spb / 2;
    while (this.nextTime < this.ctx.currentTime + 0.35) {
      const st = this.step % (p.bars * p.steps), bar = Math.floor(st / p.steps), s = st % p.steps, t = this.nextTime;
      const ch = p.chords[bar];
      // swing the off-beats slightly
      const tt = t + (s % 2 ? stepDur * 0.08 : 0);
      if (!this.mute.music && this.vol.music > 0) {
        // ukulele strum on selected steps (map 8 steps to the 16-grid pattern above: even steps only + syncopations)
        const stm = p.strums.find(x => x.s === s);
        if (stm) { const order = stm.d ? [0, 1, 2, 3] : [3, 2, 1, 0]; order.forEach((k, i) => this.ukulele(mtof(ch[k] + 12), tt + i * 0.012, stm.d ? 0.12 : 0.08)); }
        // bass note on beat 1 and 3
        if (s === 0 || s === 4) this.tone(mtof(ch[0] - 12), tt, 0.5, { type: 'sine', vol: 0.18, bus: this.musicBus, a: 0.01 });
        // lead
        const m = p.melody[st]; if (m != null && (!this.reduceAudio || s % 2 === 0)) this.lead(v.lead, mtof(m), tt, v.lead === 'bell' ? 0.1 : 0.15);
        // steel drum answer on bar ends
        if (v.lead !== 'steel' && s === 6 && bar % 2 === 1) this.steel(mtof(ch[2] + 12), tt, 0.09);
        // percussion
        const pv = v.perc;
        if (pv > 0.1) {
          if (s % 2 === 1) this.noise(tt, 0.05, { type: 'highpass', f: 6500, vol: 0.05 * pv, bus: this.musicBus });
          if (s === 0 || (s === 5 && pv > 0.5)) this.tone(110, tt, 0.18, { type: 'sine', vol: 0.16 * pv, bus: this.musicBus, glide: 0.5 });
          if (s === 3 || s === 7) this.tone(520, tt, 0.07, { type: 'triangle', vol: 0.06 * pv, bus: this.musicBus, glide: 0.8 });
        }
      }
      this.step++; this.nextTime += stepDur;
    }
  }

  /* ---------- ambience ---------- */
  setAmbience(kind) {
    if (!this.ensure() || (this.ambience && this.ambience.kind === kind)) return;
    if (this.ambience) { const old = this.ambience; old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); setTimeout(() => { try { old.src.stop(); old.lfo.stop(); } catch (e) {} }, 1800); }
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = this._noise; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = kind === 'wind' ? 'bandpass' : 'lowpass'; fl.frequency.value = kind === 'wind' ? 700 : 520; fl.Q.value = kind === 'wind' ? 1.2 : 0.4;
    const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(kind === 'night' ? 0.06 : 0.16, c.currentTime, 0.8);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = kind === 'wind' ? 0.12 : 0.11; lg.gain.value = kind === 'wind' ? 0.07 : 0.1; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(fl); fl.connect(g); g.connect(this.ambBus); src.start();
    this.ambience = { kind, src, gain: g, lfo };
    clearInterval(this._birds); this._birds = setInterval(() => this._critter(kind), 5200);
  }
  _critter(kind) {
    if (!this.ctx || this.ctx.state !== 'running' || this.mute.music || Math.random() < 0.45) return;
    const t = this.now(), b = this.ambBus;
    if (kind === 'night') { for (let i = 0; i < 4; i++) this.tone(3600, t + i * 0.09, 0.05, { type: 'square', vol: 0.012, bus: b }); return; }
    if (kind === 'wind') return;
    const f = 2000 + Math.random() * 1200; for (let i = 0; i < 3; i++) this.tone(f * (1 + i * 0.12), t + i * 0.09, 0.08, { type: 'sine', vol: 0.03, bus: b, glide: 1.25 });
  }

  /* ---------- SFX ---------- */
  sfx(name, arg) {
    if (!this.ensure() || this.mute.sfx || this.ctx.state !== 'running') return;
    try { (this['_s_' + name] || (() => {})).call(this, arg); } catch (e) { /* never let audio break the game */ }
  }
  _s_pickup() { const t = this.now(); this.tone(520, t, 0.09, { type: 'sine', vol: 0.18, glide: 1.5 }); this.noise(t, 0.04, { type: 'highpass', f: 4000, vol: 0.05 }); }
  _s_drop() { const t = this.now(); this.tone(180, t, 0.12, { type: 'sine', vol: 0.3, glide: 0.5 }); this.noise(t, 0.05, { type: 'lowpass', f: 900, vol: 0.12 }); }
  _s_swap() { const t = this.now(); this.tone(300, t, 0.07, { vol: 0.15, glide: 1.4 }); this.tone(400, t + 0.06, 0.07, { vol: 0.15, glide: 0.8 }); }
  _s_invalid() { const t = this.now(); this.tone(120, t, 0.18, { type: 'triangle', vol: 0.3, glide: 0.7 }); this.tone(110, t + 0.09, 0.16, { type: 'triangle', vol: 0.25, glide: 0.7 }); }
  _s_tap() { const t = this.now(); this.tone(660, t, 0.06, { type: 'triangle', vol: 0.15 }); }
  _s_spawn() { const t = this.now(); this.tone(420, t, 0.12, { vol: 0.2, glide: 1.8 }); this.tone(840, t + 0.04, 0.1, { vol: 0.08, glide: 1.4 }); }
  _s_merge(level = 1) {
    const t = this.now(), L = Math.max(1, Math.min(12, level)), f = 392 * Math.pow(2, (L - 1) / 12);
    this.tone(f, t, 0.5, { type: 'sine', vol: 0.26 }); this.tone(f * 2, t, 0.35, { type: 'sine', vol: 0.12 }); this.tone(f * 3.01, t + 0.02, 0.2, { type: 'sine', vol: 0.06 });
    this.tone(f * 1.5, t + 0.07, 0.4, { type: 'triangle', vol: 0.1 });
    this.noise(t, 0.08, { type: 'highpass', f: 5000, vol: 0.05 });
  }
  _s_bonus4(level = 1) { this._s_merge(level); const t = this.now() + 0.1, f = 392 * Math.pow(2, (Math.max(1, level)) / 12); this.tone(f * 1.25, t, 0.4, { vol: 0.15 }); }
  _s_bonus5(level = 1) { this._s_merge(level); const t = this.now(), f = 392 * Math.pow(2, (Math.max(1, level)) / 12); [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(f * m, t + 0.06 * (i + 1), 0.6, { vol: 0.16 })); this.noise(t, 0.4, { type: 'bandpass', f: 4000, q: 0.6, vol: 0.06, sweep: 2 }); }
  _s_cascade(n = 1) { this._s_merge(3 + n); }
  _s_hit(kind = 'rustle') {
    const t = this.now();
    if (kind === 'rustle') this.noise(t, 0.18, { type: 'highpass', f: 2800, q: 0.7, vol: 0.2 });
    else if (kind === 'chop') { this.tone(150, t, 0.1, { type: 'triangle', vol: 0.35, glide: 0.5 }); this.noise(t, 0.06, { type: 'bandpass', f: 1800, vol: 0.2 }); }
    else if (kind === 'crack') { this.noise(t, 0.05, { type: 'highpass', f: 3500, vol: 0.3 }); this.tone(90, t, 0.18, { type: 'sine', vol: 0.35, glide: 0.4 }); }
    else { this.tone(70, t, 0.3, { type: 'sine', vol: 0.45, glide: 0.5 }); this.noise(t, 0.25, { type: 'lowpass', f: 700, vol: 0.3, sweep: 0.4 }); }
  }
  _s_clear() { const t = this.now(); this.noise(t, 0.22, { type: 'highpass', f: 2400, vol: 0.18 }); [0, 0.07, 0.14].forEach((d, i) => this.tone(600 * Math.pow(1.26, i), t + 0.05 + d, 0.18, { vol: 0.14 })); }
  _s_hammer() { const t = this.now(); for (let i = 0; i < 4; i++) { this.tone(220, t + i * 0.2, 0.08, { type: 'square', vol: 0.12, glide: 0.5, lp: 1200 }); this.noise(t + i * 0.2, 0.05, { type: 'bandpass', f: 1600, vol: 0.2 }); } this.bellDone = true; }
  _s_built() { const t = this.now(); [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.09, 0.7, { vol: 0.2 })); }
  _s_chest() { const t = this.now(); this.tone(140, t, 0.25, { type: 'triangle', vol: 0.3, glide: 0.6 }); [660, 830, 990, 1320, 1660].forEach((f, i) => this.tone(f, t + 0.12 + i * 0.07, 0.5, { vol: 0.14 })); this.noise(t + 0.1, 0.5, { type: 'highpass', f: 6000, vol: 0.05 }); }
  _s_coin() { const t = this.now(); this.tone(1318, t, 0.1, { type: 'square', vol: 0.06 }); this.tone(1760, t + 0.07, 0.25, { type: 'square', vol: 0.06 }); }
  _s_energy() { const t = this.now(); this.tone(500, t, 0.3, { type: 'sawtooth', vol: 0.07, glide: 2.6, lp: 3000 }); this.tone(1000, t + 0.1, 0.3, { vol: 0.1, glide: 1.5 }); }
  _s_quest() { const t = this.now(); [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => { this.tone(f, t + i * 0.1, 0.5, { vol: 0.18, type: 'triangle' }); this.tone(f * 2, t + i * 0.1, 0.3, { vol: 0.05 }); }); }
  _s_level() { const t = this.now(); [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => { this.tone(f, t + i * 0.11, 0.8, { vol: 0.2, type: 'triangle' }); this.tone(f / 2, t + i * 0.11, 0.8, { vol: 0.1 }); }); this.tone(1568, t + 0.75, 1.2, { vol: 0.16 }); this.noise(t + 0.7, 1.0, { type: 'highpass', f: 6000, vol: 0.05 }); }
  _s_zone() { const t = this.now(); [261.63, 329.63, 392, 523.25].forEach(f => { this.tone(f, t, 2.2, { type: 'sawtooth', vol: 0.05, a: 0.5, lp: 1400 }); this.tone(f * 2, t + 0.3, 1.8, { vol: 0.06, a: 0.4 }); }); this.noise(t, 1.6, { type: 'bandpass', f: 600, q: 0.5, vol: 0.12, a: 0.6, sweep: 4 }); }
  _s_sell() { const t = this.now(); this.tone(1568, t, 0.08, { type: 'square', vol: 0.06 }); this.tone(2093, t + 0.07, 0.3, { type: 'square', vol: 0.06 }); this.noise(t, 0.12, { type: 'highpass', f: 5000, vol: 0.08 }); }
  _s_ui() { const t = this.now(); this.tone(700, t, 0.05, { type: 'triangle', vol: 0.1 }); }
  _s_open() { const t = this.now(); this.tone(480, t, 0.09, { type: 'triangle', vol: 0.1, glide: 1.4 }); }
  _s_close() { const t = this.now(); this.tone(520, t, 0.09, { type: 'triangle', vol: 0.1, glide: 0.7 }); }
  _s_resident() { const t = this.now(); [659.25, 783.99, 880].forEach((f, i) => this.tone(f, t + i * 0.08, 0.35, { vol: 0.14, type: 'triangle' })); }
  _s_pet() { const t = this.now(); this.tone(900, t, 0.1, { vol: 0.12, glide: 1.4 }); this.tone(1200, t + 0.09, 0.14, { vol: 0.12, glide: 0.8 }); }
  _s_hint() { const t = this.now(); this.tone(1046.5, t, 0.2, { vol: 0.05 }); }
  _s_shimmer() { const t = this.now(); [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(f, t + i * 0.05, 0.4, { vol: 0.07 })); }
  _s_whoosh() { const t = this.now(); this.noise(t, 0.3, { type: 'bandpass', f: 500, q: 0.8, vol: 0.12, sweep: 5 }); }
  _s_dragon() { const t = this.now(); this.tone(180, t, 0.7, { type: 'sawtooth', vol: 0.12, glide: 0.5, lp: 900 }); this.noise(t, 0.6, { type: 'lowpass', f: 600, vol: 0.2 }); }
}
