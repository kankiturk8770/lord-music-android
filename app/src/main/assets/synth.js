// Lord Music audio engine: demo tracks are composed live in Web Audio, your own files play through the same 10-band EQ.
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function rng(seed) {
  let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

class Engine {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.playing = false;
    this.offset = 0; // seconds into the track when paused / at startTime
    this.startTime = 0;
    this.nextStep = 0;
    this.timer = null;
    this.onEnd = null;
    this.eq = EQ_BANDS.map(() => 0);
    this.bass = 0;
    this.virt = 0.3;
    this.volume = 0.8;
  }
  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.filters = EQ_BANDS.map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
      b.frequency.value = f;
      b.Q.value = 1.1;
      b.gain.value = this.eq[i];
      return b;
    });
    this.bassF = ctx.createBiquadFilter();
    this.bassF.type = "lowshelf";
    this.bassF.frequency.value = 110;
    this.bassF.gain.value = this.bass;
    // virtualizer: ping-pong space
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.dl = ctx.createDelay(1);
    this.dr = ctx.createDelay(1);
    this.dl.delayTime.value = 0.19;
    this.dr.delayTime.value = 0.27;
    this.fb = ctx.createGain();
    this.fb.gain.value = 0.32;
    const merger = ctx.createChannelMerger(2);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 3;
    this.vol = ctx.createGain();
    this.vol.gain.value = this.volume;
    this.fade = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;

    let node = this.input;
    for (const f of this.filters) { node.connect(f); node = f; }
    node.connect(this.bassF);
    this.bassF.connect(this.dry);
    this.bassF.connect(this.dl);
    this.dl.connect(this.dr);
    this.dr.connect(this.fb);
    this.fb.connect(this.dl);
    this.dl.connect(merger, 0, 0);
    this.dr.connect(merger, 0, 1);
    merger.connect(this.wet);
    this.dry.connect(this.comp);
    this.wet.connect(this.comp);
    this.comp.connect(this.fade);
    this.fade.connect(this.vol);
    this.vol.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    this.setVirt(this.virt);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setEq(i, v) { this.eq[i] = v; if (this.filters) this.filters[i].gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }
  setBass(v) { this.bass = v; if (this.bassF) this.bassF.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }
  setVirt(p) {
    this.virt = p;
    if (!this.wet) return;
    this.wet.gain.setTargetAtTime(p * 0.55, this.ctx.currentTime, 0.05);
    this.dry.gain.setTargetAtTime(1 - p * 0.2, this.ctx.currentTime, 0.05);
  }
  setVolume(v) { this.volume = v; if (this.vol) this.vol.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }

  attachMedia() {
    if (this.media) return;
    this.media = new Audio();
    this.media.preload = "auto";
    this.mediaSrc = this.ctx.createMediaElementSource(this.media);
    this.mediaSrc.connect(this.input);
    this.media.addEventListener("ended", () => { this.playing = false; this.onEnd && this.onEnd(); });
  }
  position() {
    if (!this.track) return 0;
    if (this.track.url) return this.media ? this.media.currentTime : 0;
    if (!this.playing) return this.offset;
    return Math.min(this.track.duration, this.offset + (this.ctx.currentTime - this.startTime));
  }
  load(track, autoplay) {
    const was = this.playing;
    if (this.track && this.track.url && this.media) this.media.pause();
    this.stopScheduler();
    this.playing = false;
    this.track = track;
    this.offset = 0;
    if (track.url) { this.init(); this.attachMedia(); this.media.src = track.url; }
    if (autoplay ?? was) this.play();
  }
  play() {
    this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (!this.track) return;
    if (this.track.url) {
      this.attachMedia();
      this.fade.gain.cancelScheduledValues(this.ctx.currentTime);
      this.fade.gain.setValueAtTime(1, this.ctx.currentTime);
      this.playing = true;
      this.media.play().catch(() => { this.playing = false; });
      return;
    }
    if (this.offset >= this.track.duration - 0.2) this.offset = 0;
    this.playing = true;
    this.startTime = this.ctx.currentTime + 0.05;
    const sps = (this.track.bpm / 60) * 4;
    this.nextStep = Math.ceil(this.offset * sps);
    this.fade.gain.cancelScheduledValues(this.ctx.currentTime);
    this.fade.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.fade.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.25);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }
  pause() {
    if (!this.playing) return;
    if (this.track.url) { this.media.pause(); this.playing = false; return; }
    this.offset = this.position();
    this.playing = false;
    const t = this.ctx.currentTime;
    this.fade.gain.cancelScheduledValues(t);
    this.fade.gain.setValueAtTime(this.fade.gain.value || 1, t);
    this.fade.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    this.stopScheduler();
  }
  stopScheduler() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.playing) this.offset = this.position();
  }
  seek(sec) {
    if (this.track.url) { if (this.media) this.media.currentTime = sec; return; }
    const was = this.playing;
    if (was) this.pause();
    this.offset = Math.max(0, Math.min(sec, this.track.duration - 0.5));
    if (was) setTimeout(() => this.play(), 60);
  }
  tick() {
    if (!this.playing) return;
    const tr = this.track;
    const sps = (tr.bpm / 60) * 4;
    const ahead = this.ctx.currentTime + 0.12;
    while (true) {
      const tTrack = this.nextStep / sps;
      const t = this.startTime + (tTrack - this.offset);
      if (t > ahead) break;
      if (tTrack >= tr.duration) {
        this.playing = false;
        this.offset = tr.duration;
        clearInterval(this.timer);
        setTimeout(() => this.onEnd && this.onEnd(), Math.max(0, (t - this.ctx.currentTime) * 1000));
        return;
      }
      if (t >= this.ctx.currentTime - 0.01) this.step(this.nextStep, Math.max(t, this.ctx.currentTime), tTrack);
      this.nextStep++;
    }
  }
  // ---- instruments
  voice(type, freq, t, dur, gain, cutoff = 4000, detune = 0) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.input);
    o.start(t); o.stop(t + dur + 0.05);
  }
  kick(t, gain = 0.9) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(this.input);
    o.start(t); o.stop(t + 0.4);
  }
  hit(t, hp, dur, gain) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.input);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  step(n, t, tTrack) {
    const tr = this.track;
    const s = n % 16;
    const bar = Math.floor(n / 16);
    const scale = SCALES[tr.scale];
    const deg = tr.prog[bar % tr.prog.length];
    const sec = 1 / ((tr.bpm / 60) * 4);
    const intro = tTrack < 8, outro = tTrack > tr.duration - 8;
    const sectionB = Math.floor(bar / 8) % 2 === 1;
    const chordNote = (k, oct) => {
      const idx = deg + k;
      return tr.root + oct * 12 + scale[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);
    };
    // pad
    if (s === 0) {
      [0, 2, 4].forEach((k, i) =>
        this.voice(tr.pad, NOTE(chordNote(k, 0)), t, sec * 16 * 1.05, 0.05, 1600, i * 6 - 6));
    }
    if (intro) return;
    // drums
    const four = tr.groove === "four";
    if (s === 0 || s === 8 || (four && (s === 4 || s === 12)) || (!four && s === 10 && sectionB)) this.kick(t, 0.85);
    if (s === 4 || s === 12) this.hit(t, 1800, 0.18, 0.22);
    if (!outro && s % 2 === 0) this.hit(t, 7000, 0.05, s % 4 === 2 ? 0.09 : 0.045);
    if (!outro && tr.groove === "swing" && s % 4 === 3) this.hit(t, 8000, 0.03, 0.04);
    // bass
    if (s % 4 === 0 || (sectionB && s === 14)) this.voice("sawtooth", NOTE(chordNote(0, -2)), t, sec * 3, 0.16, 520);
    // lead
    if (outro) return;
    const r = rng(n * 7 + tr.seed);
    if (r < tr.density * (sectionB ? 1.3 : 1)) {
      const k = [0, 2, 4, 1, 4, 2, 6][Math.floor(rng(n + tr.seed * 3) * 7)];
      this.voice(tr.lead, NOTE(chordNote(k, 1)), t, sec * (r < 0.12 ? 3 : 1.6), 0.07, 3200);
    }
    if (s === 0 && sectionB) this.voice("sine", NOTE(chordNote(4, 2)), t, sec * 8, 0.035, 5000);
  }
  levels(arr) {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(arr);
    return arr;
  }
}

window.LM_EQ_BANDS = EQ_BANDS;
window.engine = new Engine();
