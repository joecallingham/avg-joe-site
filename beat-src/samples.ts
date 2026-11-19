// The drum machine's made samples (Joe, 2026-10-21: "rebuild all the sounds
// to match the examples ... actual guitar and drums sounds", by synthesis
// alone: no recordings or bought packs). Each sound is worked out sample by
// sample, once per audio context, then played back as a sample: drums from
// their resonant modes and noise, cymbals from dozens of clashing partials,
// strings by Karplus-Strong (a burst of noise round a tuned delay line, the
// way a plucked string rings), a piano by its stretched partials, a Rhodes
// by its tine. Seeded, so a sound is the same every time.

// ---- Tools -------------------------------------------------------------------

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A biquad filter (the usual cookbook ones), run over samples.
type BQType = "lowpass" | "highpass" | "bandpass" | "peaking";
export class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  constructor(type: BQType, f: number, q: number, sr: number, gainDb = 0) {
    const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    const A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lowpass") [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + al, -2 * cs, 1 - al];
    else if (type === "highpass") [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
    else if (type === "bandpass") [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cs, 1 - al];
    else [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cs, 1 - al * A, 1 + al / A, -2 * cs, 1 - al / A];
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
const filt = (d: Float32Array, ...fs: Biquad[]) => {
  for (let i = 0; i < d.length; i++) {
    let v = d[i];
    for (const f of fs) v = f.run(v);
    d[i] = v;
  }
  return d;
};
const norm = (d: Float32Array, peak: number) => {
  let m = 0;
  for (const v of d) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m;
  return d;
};
// Noise, shaped by an envelope.
const noise = (n: number, rnd: () => number) => Float32Array.from({ length: n }, () => rnd() * 2 - 1);
// Old samplers' grit (Joe's hip hop reference was made on them): the sound
// held at a lower rate and cut to fewer bits, as an SP-1200 does (26kHz,
// 12 bits).
export function crunch(d: Float32Array, sr: number, rate = 26040, bits = 12) {
  const step = sr / rate;
  const q = 2 ** (bits - 1);
  let held = 0;
  let acc = step;
  for (let i = 0; i < d.length; i++) {
    if (acc >= step) {
      held = Math.round(d[i] * q) / q;
      acc -= step;
    }
    d[i] = held;
    acc += 1;
  }
  return filt(d, new Biquad("lowpass", rate * 0.42, 0.7, sr));
}

// Made once per audio context and name.
const made = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
export function sample(ctx: BaseAudioContext, name: string, secs: number, make: (d: Float32Array, sr: number) => void): AudioBuffer {
  let m = made.get(ctx);
  if (!m) made.set(ctx, (m = new Map()));
  let b = m.get(name);
  if (!b) {
    b = ctx.createBuffer(1, Math.max(1, Math.round(secs * ctx.sampleRate)), ctx.sampleRate);
    make(b.getChannelData(0), ctx.sampleRate);
    m.set(name, b);
  }
  return b;
}

// ---- Drums --------------------------------------------------------------------

// A kick: a body falling from `top` to `low` Hz, dying over `decay`, with
// the beater's click.
export function kick(d: Float32Array, sr: number, o: { low: number; top: number; drop: number; decay: number; click: number; clickHz: number; seed: number }) {
  const rnd = seeded(o.seed);
  let ph = 0;
  const clk = filt(noise(Math.round(sr * 0.02), rnd), new Biquad("bandpass", o.clickHz, 1.2, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const f = o.low + (o.top - o.low) * Math.exp(-t / o.drop);
    ph += (2 * Math.PI * f) / sr;
    const a = Math.min(1, t / 0.0015) * Math.exp(-t / o.decay);
    let v = Math.sin(ph) * a;
    if (i < clk.length) v += clk[i] * o.click * Math.exp(-t / 0.003);
    d[i] = Math.tanh(v * 1.6) / Math.tanh(1.6);
  }
  norm(d, 0.95);
}
// A snare: its shell's modes, the wires (bright noise, longer), and the
// stick's crack.
export function snare(
  d: Float32Array,
  sr: number,
  o: { modes: [number, number, number][]; wires: number; wireDecay: number; wireHz: number; crack: number; seed: number },
) {
  const rnd = seeded(o.seed);
  const w = filt(noise(d.length, rnd), new Biquad("highpass", 1400, 0.7, sr), new Biquad("bandpass", o.wireHz, 0.6, sr));
  const c = filt(noise(d.length, rnd), new Biquad("highpass", 5500, 0.7, sr));
  const ph = o.modes.map(() => 0);
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let v = 0;
    o.modes.forEach(([f, decay, lvl], k) => {
      ph[k] += (2 * Math.PI * f * (1 + 0.06 * Math.exp(-t / 0.008))) / sr;
      v += Math.sin(ph[k]) * lvl * Math.exp(-t / decay);
    });
    const att = Math.min(1, t / 0.001);
    v += w[i] * o.wires * att * Math.exp(-t / o.wireDecay);
    v += c[i] * o.crack * Math.exp(-t / 0.008);
    d[i] = v;
  }
  norm(d, 0.9);
}
// A cymbal: dozens of partials at clashing pitches from `lo` to `hi` Hz,
// each dying at its own rate, over a bright hiss. `trash` rings it against
// itself (a china's snarl).
export function cymbal(d: Float32Array, sr: number, o: { decay: number; lo: number; hi: number; partials: number; hiss: number; trash: number; seed: number }) {
  const rnd = seeded(o.seed);
  const ps = Array.from({ length: o.partials }, () => ({
    f: o.lo * (o.hi / o.lo) ** rnd(),
    a: 0.3 + rnd() * 0.7,
    dec: o.decay * (0.3 + rnd() * 0.8),
    ph: rnd() * 6.283,
  }));
  const h = filt(noise(d.length, rnd), new Biquad("highpass", 5000, 0.7, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let v = 0;
    for (const p of ps) v += Math.sin(p.ph + 2 * Math.PI * p.f * t) * p.a * Math.exp(-t / p.dec);
    v = v / Math.sqrt(o.partials) + h[i] * o.hiss * Math.exp(-t / (o.decay * 0.5));
    if (o.trash) v *= 1 + o.trash * Math.sin(2 * Math.PI * 317 * t);
    d[i] = v * Math.min(1, t / 0.0015);
  }
  filt(d, new Biquad("highpass", 2500, 0.7, sr));
  norm(d, 0.8);
}
// The TR-808's cymbal and hat: six square waves at its own clashing
// pitches through its two bands.
export function cymbal808(d: Float32Array, sr: number, o: { decay: number; hat: boolean }) {
  const fs = [205.3, 304.4, 369.6, 522.7, 540, 800];
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let v = 0;
    for (const f of fs) v += Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1;
    d[i] = v / 6;
  }
  const lo = filt(d.slice(), new Biquad("bandpass", 3440, 1.2, sr));
  const hi = filt(d.slice(), new Biquad("bandpass", 7100, 1.2, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t / o.decay);
    d[i] = (o.hat ? hi[i] : lo[i] * 0.6 * Math.exp(-t / (o.decay * 0.5)) + hi[i]) * env;
  }
  filt(d, new Biquad("highpass", o.hat ? 6000 : 3000, 0.7, sr));
  norm(d, 0.7);
}
// The 808's bass drum: a near-pure sine with a small fall and a soft
// click; `tune` sets it (Portishead pitched theirs up).
export function kick808(d: Float32Array, sr: number, o: { tune: number; decay: number }) {
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const f = o.tune * (1 + 0.6 * Math.exp(-t / 0.012));
    ph += (2 * Math.PI * f) / sr;
    d[i] = Math.sin(ph) * Math.exp(-t / o.decay) * Math.min(1, t / 0.001) + (t < 0.002 ? 0.3 * (1 - t / 0.002) : 0);
  }
  norm(d, 0.95);
}
// The 808's rim shot: a click ringing two tuned resonators, short.
export function rim808(d: Float32Array, sr: number) {
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    d[i] = Math.sin(2 * Math.PI * 1667 * t) * Math.exp(-t / 0.008) + 0.8 * Math.sin(2 * Math.PI * 455 * t) * Math.exp(-t / 0.014);
  }
  filt(d, new Biquad("highpass", 300, 0.7, sr));
  norm(d, 0.8);
}
// A clap: several hands a few milliseconds apart, then the room.
export function clap(d: Float32Array, sr: number, seed: number) {
  const rnd = seeded(seed);
  const n = filt(noise(d.length, rnd), new Biquad("bandpass", 1150, 1.1, sr), new Biquad("highpass", 600, 0.7, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let e = 0;
    for (const at of [0, 0.011, 0.023, 0.031]) if (t >= at) e = Math.max(e, Math.exp(-(t - at) / 0.007));
    if (t >= 0.031) e = Math.max(e, 0.55 * Math.exp(-(t - 0.031) / 0.12));
    d[i] = n[i] * e;
  }
  norm(d, 0.85);
}
// Something hit that rings like metal (a beer keg): a few inharmonic modes
// and a clank.
export function clang(d: Float32Array, sr: number, o: { f: number; seed: number }) {
  const rnd = seeded(o.seed);
  const modes = [1, 1.59, 2.14, 2.65, 3.17, 4.4].map((m, k) => ({ f: o.f * m, dec: 0.7 / (1 + k * 0.45), a: 1 / (1 + k * 0.4) }));
  const c = filt(noise(Math.round(sr * 0.05), rnd), new Biquad("bandpass", 2400, 1.2, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let v = 0;
    for (const m of modes) v += Math.sin(2 * Math.PI * m.f * t) * m.a * Math.exp(-t / m.dec);
    if (i < c.length) v += c[i] * 1.2 * Math.exp(-t / 0.01);
    v += Math.sin(2 * Math.PI * 140 * t) * 0.6 * Math.exp(-t / 0.05);
    d[i] = v;
  }
  norm(d, 0.85);
}
// A record's crackle and hiss.
export function crackle(d: Float32Array, sr: number, seed: number) {
  const rnd = seeded(seed);
  const hiss = filt(noise(d.length, rnd), new Biquad("bandpass", 5000, 0.5, sr));
  for (let i = 0; i < d.length; i++) {
    d[i] = hiss[i] * 0.04;
    if (rnd() < 18 / sr) {
      const a = (rnd() * 2 - 1) * (0.3 + rnd() * 0.7);
      for (let k = 0; k < 12 && i + k < d.length; k++) d[i + k] += a * Math.exp(-k / 2.5);
    }
  }
  filt(d, new Biquad("highpass", 900, 0.7, sr));
  norm(d, 0.6);
}

// ---- Strings and keys -----------------------------------------------------------

// A plucked string (Karplus-Strong): a burst of noise round a delay line a
// period long, losing a little each time round, so it rings and darkens as
// a string does. `ring` is how long it takes to die away (short: a palm
// mute); `bright` the pick.
export function pluck(d: Float32Array, sr: number, o: { f: number; ring: number; bright: number; seed: number; at?: number }) {
  const rnd = seeded(o.seed);
  const N = Math.max(2, Math.round(sr / o.f));
  const g = 10 ** (-3 / (o.ring * o.f));
  const s = 0.5 + 0.45 * (1 - o.bright);
  const start = Math.round((o.at ?? 0) * sr);
  const line = new Float32Array(N);
  let lp = 0;
  for (let k = 0; k < N; k++) {
    lp += (rnd() * 2 - 1 - lp) * (0.2 + 0.8 * o.bright);
    line[k] = lp;
  }
  let prev = 0;
  for (let i = 0; i + start < d.length; i++) {
    const k = i % N;
    const cur = line[k];
    const out = cur;
    line[k] = g * (s * cur + (1 - s) * prev);
    prev = cur;
    d[i + start] += out;
  }
}
// A guitar's power chord, palm-muted: root, fifth and octave plucked a few
// milliseconds apart (the pick across the strings).
export function powerChord(d: Float32Array, sr: number, o: { f: number; ring: number; seed: number }) {
  [1, 1.4983, 2].forEach((m, k) => pluck(d, sr, { f: o.f * m, ring: o.ring, bright: 0.85, seed: o.seed + k * 17, at: k * 0.0035 }));
  norm(d, 0.9);
}
// A piano note: two strings a shade apart (they beat), each partial a
// little sharp of a whole harmonic as a stiff string's are, the higher ones
// dying first, with the hammer's thump.
export function piano(d: Float32Array, sr: number, o: { f: number; seed: number }) {
  const rnd = seeded(o.seed);
  const B = 0.00035;
  const parts = Array.from({ length: 12 }, (_, k) => {
    const n = k + 1;
    return { n, f: n * o.f * Math.sqrt(1 + B * n * n), a: (1 / n) ** 1.15 * Math.abs(Math.sin(Math.PI * n * 0.13)) * 2, dec: 2.8 / (1 + 0.4 * k) };
  }).filter((p) => p.f < sr * 0.45);
  const ham = filt(noise(Math.round(sr * 0.03), rnd), new Biquad("lowpass", 1800, 0.7, sr));
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    let v = 0;
    for (const p of parts)
      for (const c of [-0.8, 0.8]) {
        const f = p.f * 2 ** (c / 1200);
        v += Math.sin(2 * Math.PI * f * t) * p.a * (0.7 * Math.exp(-t / (p.dec * 0.22)) + 0.3 * Math.exp(-t / p.dec));
      }
    if (i < ham.length) v += ham[i] * 0.35 * Math.exp(-t / 0.008);
    d[i] = v * Math.min(1, t / 0.002);
  }
  norm(d, 0.6);
}
// A Rhodes note: the tine's tone, its bark at the strike (a high, quickly
// gone partial and a little breakup), settling into a near-sine.
export function rhodes(d: Float32Array, sr: number, o: { f: number }) {
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t / 2.4) * Math.min(1, t / 0.002);
    let v = Math.sin(2 * Math.PI * o.f * t) * env;
    v += 0.22 * Math.sin(2 * Math.PI * 2 * o.f * t) * Math.exp(-t / 0.6);
    v += 0.16 * Math.sin(2 * Math.PI * 7.1 * o.f * t) * Math.exp(-t / 0.04);
    d[i] = Math.tanh(v * 1.5) / Math.tanh(1.5);
  }
  norm(d, 0.6);
}

// ---- Scratching ------------------------------------------------------------------

// A DJ's scratch: a recording (`src`, at `srcSr`) read along the record's
// path under the needle, stroke by stroke, each a hand's move from one
// place in the sound (`from`, seconds) to another, slowing to a stop at
// either end; quieter and duller as it slows, the needle's drag under it.
// The crossfader opens over the `open` parts of each stroke (fractions of
// it), and `chops` cuts it on and off that many times (a transformer).
export type Stroke = { at: number; dur: number; from: number; to: number; open?: [number, number][]; chops?: number };
export function scratch(d: Float32Array, sr: number, src: Float32Array, srcSr: number, strokes: Stroke[], seed: number) {
  const rnd = seeded(seed);
  const k = 1 - Math.exp(-1 / (0.0012 * sr)); // (the fader's few milliseconds)
  let fader = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const s = strokes.find((st) => t >= st.at && t < st.at + st.dur);
    let want = 0;
    let out = 0;
    if (s) {
      const u = (t - s.at) / s.dur;
      const pos = s.from + ((s.to - s.from) * (1 - Math.cos(Math.PI * u))) / 2;
      const speed = Math.abs(((s.to - s.from) * Math.PI * Math.sin(Math.PI * u)) / (2 * s.dur));
      want = (s.open ?? [[0, 1]]).some(([a, b]) => u >= a && u < b) ? 1 : 0;
      if (want && s.chops) want = Math.floor(u * s.chops * 2) % 2 === 0 ? 1 : 0;
      const x = pos * srcSr;
      const j = Math.floor(x);
      const a = src[j] ?? 0;
      const b = src[j + 1] ?? 0;
      out = (a + (b - a) * (x - j)) * Math.min(1, Math.sqrt(speed)) + (rnd() * 2 - 1) * 0.015 * Math.min(1, speed);
    }
    fader += (want - fader) * k;
    d[i] = out * fader;
  }
  return filt(d, new Biquad("lowpass", 9000, 0.7, sr), new Biquad("highpass", 120, 0.7, sr));
}
