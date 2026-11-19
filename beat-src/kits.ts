// The drum machine's kits (Joe, 2026-10-21: presets for "Soundcloud Trap",
// "Death Metal", "Hip hop" and "Trip hop", each changing every sound and the
// vocal effect, then each "as similar to the examples given as possible":
// Trippie Redd and Juice WRLD's 1400 / 999 Freestyle, Slipknot's Eyeless,
// Earl Sweatshirt's Wool and Portishead's It Could Be Sweet; by synthesis
// alone, Joe's choice over free samples or his own recordings). The drums,
// strings and keys are made samples (samples.ts), played back here through
// amps, rooms and echoes; a few things stay live (the shouts, the scratch,
// the siren, the theremin, the subs). Nobody's real voice is used.

import { rootHz, type MusicKey } from "./musicKey";
import * as S from "./samples";

export type Kit = "trap" | "metal" | "hiphop" | "triphop" | "florida";
export type KitVoice = "kick" | "snare" | "hat" | "clap" | "bass" | "bodhran" | "synth" | "animal";
// (`step`: a sixteenth's length at the tempo, for the sounds timed to it.)
export type KitEngine = { ctx: BaseAudioContext; out: GainNode; noise: AudioBuffer; root?: number; bend?: ConstantSourceNode; step?: number };

// What the pads are in each kit, in PADS's order (the slots' ids stay the
// same; what each one is follows the kit's reference track: Joe,
// 2026-10-21, "base all of these sound choices off of the references").
// - Soundcloud Trap (1400 / 999 Freestyle): kick, open hat, hat, clap, 808,
//   the breathy woodwind, the soft piano, a reverse swell.
// - Death Metal (Eyeless, after Songsterr's transcription): kick, the steel
//   snare, the crash (on every beat), Clown's keg, the DJ's scratch;
//   Brendon Padjasek's squeals, the djent riff and a lead guitar (Joe,
//   2026-10-21: they were the beating guitar "siren" and screams).
// - Hip Hop (Westside Gunn's Griselda, Joe 2026-10-21: "more Westside Gunn
//   style, with adlibs, Dj scratching, police sirens"; it was Earl
//   Sweatshirt's Wool): a dusty knock (kick, a dry snare with its rim shot,
//   ghost hats), a DJ's cuts, a police siren (no bass: there's often none),
//   an eerie piano loop, a falling organ line, his ad-libs.
// - Trip Hop (Portishead's Wandering Star, Joe: "more low fi"; it was It
//   Could Be Sweet): the live kit off a worn record (kick, snare with a side
//   stick, ride), Geoff Barrow's scratches, the bass, the crackle, the
//   Hammond, and the theremin (Joe, 2026-10-21: "Trip hop needs the
//   theremin back"; for a while it was Wandering Star's guitar whine).
export const LABELS: Record<Kit, string[]> = {
  trap: ["kick", "open hat", "hat", "clap", "808", "whale", "lead", "tape"],
  metal: ["kick", "snare", "crash", "keg", "scratch", "squeal", "guitar", "lead"],
  hiphop: ["kick", "snare", "hat", "scratch", "siren", "piano", "organ", "adlib"],
  triphop: ["kick", "snare", "ride", "scratch", "bass", "vinyl", "organ", "theremin"],
  florida: ["kick", "snare", "hat", "click", "808", "piano", "bell", "choir"],
};

// How late each kit plays its off-beat sixteenths, in steps: swing (the
// trip hop kit's, after Portishead's "swinging" 808 on It Could Be Sweet, about
// 60%; the hip hop kit's, Wool's lazy bounce, about 56%).
export const SWING: Record<Kit, number> = { trap: 0, metal: 0, hiphop: 0.15, triphop: 0.3, florida: 0.03 };
// A kit tuned off concert pitch, in cents (Wool sits at about 434Hz, 24 cents
// flat, by AcousticBrainz's analysis; 
// 1400 / 999 Freestyle is the same, 434.2Hz.)
const DETUNE: Record<Kit, number> = { trap: -24, metal: 0, hiphop: -24, triphop: 0, florida: 0 };

// The tuned pads' tunes: semitones from the key's tonic on each of 16 steps,
// or 32 for a two-bar line (a step that's off by default carries its
// neighbour's note), and how many times the 808's note (the tonic, low)
// they sit at.
// (`hold`: how many steps a note rings, where a part needs it.)
type Tune = { semis: number[]; at: number; hold?: number[] };
const TUNES: Record<Kit, Partial<Record<KitVoice, Tune>>> = {
  trap: {
    // XO Tour Llif3 (Joe, 2026-10-21: "Have this sound and song for
    // soundcloud rap"; it was 1400 / 999 Freestyle). 155bpm played at half
    // time, so the 32 steps are its four bars of Gmaj7, Gmaj7, Em9, F#m7
    // (fans' note-for-note transcriptions on Online Sequencer, which agree;
    // Hooktheory's chords).
    // The lead's riff: the root, the major seventh, the seventh two octaves
    // up. G3 F#4 F#6 F#4 G3 F#6 | G3 F#4 D4 F#4 D4 | B3 D5 F#6 D5 B3 F#6 | A3 A4 A3 A4 A3.
    synth: {
      semis: [-4, -4, 7, 7, 31, 7, -4, 31, -4, -4, 7, 3, 3, 7, 3, 3, 0, 0, 15, 15, 31, 15, 0, 31, -2, -2, 10, -2, -2, 10, -2, -2],
      at: 4,
    },
    // The "whale cry": F#5 then F#6, E5 then E6, a bar each.
    bodhran: { semis: [...Array(4).fill(19), ...Array(4).fill(31), ...Array(4).fill(17), ...Array(4).fill(29), ...Array(4).fill(19), ...Array(4).fill(31), ...Array(4).fill(17), ...Array(4).fill(29)], at: 4 },
    // The 808: G1 G1 F#1 | E1 E1 F#1, twice.
    bass: { semis: [...Array(10).fill(-4), ...Array(6).fill(-5), ...Array(10).fill(-7), ...Array(6).fill(-5)], at: 1 },
  },
  metal: {
    // Duality's main riff (Joe, 2026-10-21: "I'd like the song to change as
    // well to be a bit more like duality"; Songsterr's transcription, drop
    // B, it was Eyeless's): open B5 stabs, each ringing a step and stopped
    // dead | B5, C5 and B5 palm-muted, an open D5 held four steps.
    synth: {
      semis: [...Array(20).fill(0), 1, 1, 0, 0, ...Array(8).fill(3)],
      at: 1,
      hold: [...Array(24).fill(2), ...Array(8).fill(4)],
    },
    // The lead (Joe, 2026-10-21: "Change screaming to lead guitar sounds"),
    // over the riff in B minor's harmonic colour: B4 D5 C#5 F#5 | E5 D5 C#5
    // A#4 B4 (a proposal).
    animal: { semis: [12, 12, 15, 15, 14, 14, 19, 19, 17, 15, 14, 14, 11, 11, 12, 12], at: 4 },
    // The squeal: Jim Root's pinch harmonic off the A string, E5, held into
    // the next bar and bent up on its last sixteenth.
    bodhran: { semis: Array(16).fill(41), at: 1 },
  },
  hiphop: {
    // The organ's falling line over the loop (a proposal in Griselda's
    // way: nothing transcribes these beats): C#5 B4 A4 G#4, a beat each.
    synth: { semis: [12, 12, 12, 12, 10, 10, 10, 10, 8, 8, 8, 8, 7, 7, 7, 7], at: 4 },
    bodhran: { semis: Array(16).fill(0), at: 2 }, // (the piano's chords: CHORDS)
  },
  triphop: {
    // Wandering Star's bass (Songsterr's two tabs agree): B1 on each beat,
    // then A#1 under the last chord.
    bass: { semis: [...Array(24).fill(0), ...Array(8).fill(-1)], at: 1 },
    synth: { semis: [...Array(24).fill(12), ...Array(8).fill(11)], at: 1 }, // (the Hammond's chords: CHORDS)
    // The guitar's whine in the second bar: F#3 and F3 trilling in
    // sixteenths, then A3.
    animal: { semis: [...Array(16).fill(19), 19, 18, 19, 18, 19, 18, 19, 18, 19, ...Array(7).fill(22)], at: 1 },
  },
  florida: {
    // BLP Kosher's The Nac (prod. Thrax x Rami): nothing transcribes it, so
    // these are lines in its lane's way (Jacksonville street trap, in the
    // producers' tutorials): Phrygian, the flat second pulling at the root.
    // The low piano's bounce: G#3 . . G#3 . . A3 . | G#3 . B3 . . A3 . .
    bodhran: { semis: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 3, 3, 1, 1, 1], at: 4 },
    // The bell: G#4 B4 D#5 A4 | G#4 B4 E5 D#5, on the eighths.
    synth: { semis: [12, 12, 15, 15, 19, 19, 13, 13, 12, 12, 15, 15, 20, 20, 19, 19], at: 4 },
    // The 808 on the piano's roots: G#1, A1 on the eleventh step, falling to F#1.
    bass: { semis: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, -2, -2, -2], at: 1 },
    animal: { semis: Array(16).fill(0), at: 4 }, // (the choir, on G#3 and its fifth)
  },
};
// How many steps a pad's note rings on the step it's playing (`at`).
function holdAt(kit: Kit, v: KitVoice, fallback: number): number {
  const h = TUNES[kit][v]?.hold;
  return h ? h[at % h.length] : fallback;
}
// Whether a pad plays a tune (its steps' notes can be moved: SynthPlayer).
export function hasTune(kit: Kit, v: KitVoice): boolean {
  return !!TUNES[kit][v];
}
// A note's name, from its frequency (A440, sharps), for a step to show.
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function noteName(hz: number): string {
  const m = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}
// The pads that play chords: each chord's notes in semitones from the
// tonic (at `at` times the 808's note), the chord changing every `per`
// steps.
type Chords = { at: number; per: number; chords: number[][] };
const CHORDS: Partial<Record<Kit, Partial<Record<KitVoice, Chords>>>> = {
  // The Griselda loop (a proposal): C#m, F#m/A, Amaj7, G#7(b9).
  hiphop: { bodhran: { at: 2, per: 8, chords: [[0, 7, 15, 22], [-4, 5, 12, 20], [-4, 3, 7, 12], [-5, 5, 11, 20]] } },
  // Wandering Star's Hammond (the tabs' outro voicings): Bm, Bm, G/B, F#/A#.
  triphop: { synth: { at: 1, per: 8, chords: [[12, 27, 31, 43], [12, 27, 31, 43], [12, 32, 44], [11, 26, 31, 38]] } },
};
// The chord a pad plays on the step it's playing (`at`), in Hz.
function chordHz(e: KitEngine, kit: Kit, v: KitVoice): number[] {
  const c = CHORDS[kit]?.[v];
  if (!c) return [];
  const det = 2 ** (DETUNE[kit] / 1200);
  return c.chords[Math.floor(at / c.per) % c.chords.length].map((n) => (e.root ?? 55) * c.at * 2 ** (n / 12) * det);
}
// A tuned pad's note on a step, in Hz (any pad without a tune: the tonic,
// the 808's note).
export function tuneHz(kit: Kit, key: MusicKey, step: number, v: KitVoice = "synth"): number {
  const tune = TUNES[kit][v];
  const det = 2 ** (DETUNE[kit] / 1200);
  if (!tune) return rootHz(key) * det;
  const n = tune.semis.length;
  const s = tune.semis[((step % n) + n) % n];
  return rootHz(key) * tune.at * 2 ** (s / 12) * det;
}

// ---- Shared pieces --------------------------------------------------------

// Nodes made once per audio context (a distortion curve, an echo, a room).
const made = new WeakMap<BaseAudioContext, Map<string, AudioNode>>();
// (While warming, nothing's built or played: only the samples are made.)
let warming = false;
function once<T extends AudioNode>(ctx: BaseAudioContext, name: string, make: () => T): T {
  if (warming) return ctx.createGain() as unknown as T;
  let m = made.get(ctx);
  if (!m) made.set(ctx, (m = new Map()));
  let n = m.get(name) as T | undefined;
  if (!n) m.set(name, (n = make()));
  return n;
}
// A tanh drive: 1 is clean, 25 is a wall of fuzz.
export function drive(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const s = ctx.createWaveShaper();
  const c = new Float32Array(2048);
  for (let i = 0; i < c.length; i++) {
    const v = (i / (c.length - 1)) * 2 - 1;
    c[i] = Math.tanh(v * amount) / Math.tanh(amount);
  }
  s.curve = c;
  s.oversample = "2x";
  return s;
}
// A generated room: stereo noise dying away over `secs`, darker as it goes.
export function roomIR(ctx: BaseAudioContext, secs: number, dark = 0.35): AudioBuffer {
  const len = Math.round(ctx.sampleRate * secs);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += (Math.random() * 2 - 1 - lp) * dark;
      d[i] = lp * Math.exp((-4.5 * i) / len);
    }
  }
  return ir;
}
// A send to an echo (a slap: one delay fed back into itself).
function echoSend(e: KitEngine, name: string, time: number, feedback: number, level: number): AudioNode {
  return once(e.ctx, name, () => {
    const input = e.ctx.createGain();
    const d = e.ctx.createDelay(2);
    const fb = e.ctx.createGain();
    const out = e.ctx.createGain();
    d.delayTime.value = time;
    fb.gain.value = feedback;
    out.gain.value = level;
    input.connect(d).connect(out).connect(e.out);
    d.connect(fb).connect(d);
    return input;
  });
}
// A send to a room.
function roomSend(e: KitEngine, name: string, secs: number, level: number): AudioNode {
  return once(e.ctx, name, () => {
    const input = e.ctx.createGain();
    const v = e.ctx.createConvolver();
    const out = e.ctx.createGain();
    v.buffer = roomIR(e.ctx, secs);
    out.gain.value = level;
    input.connect(v).connect(out).connect(e.out);
    return input;
  });
}

// The basic strokes, at `t`: a tone sliding from f0 to f1 and dying away,
// and a burst of filtered noise.
function tone(e: KitEngine, t: number, type: OscillatorType, f0: number, f1: number, glide: number, decay: number, peak: number, to: AudioNode = e.out) {
  const o = e.ctx.createOscillator();
  const g = e.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  o.connect(g).connect(to);
  o.start(t);
  o.stop(t + decay + 0.05);
  return { o, g };
}
function hiss(e: KitEngine, t: number, type: BiquadFilterType, freq: number, decay: number, peak: number, q = 0.8, to: AudioNode = e.out) {
  const s = e.ctx.createBufferSource();
  const f = e.ctx.createBiquadFilter();
  const g = e.ctx.createGain();
  s.buffer = e.noise;
  s.loop = true;
  s.playbackRate.value = 0.9 + Math.random() * 0.2;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  s.connect(f).connect(g).connect(to);
  s.start(t, Math.random() * 0.5);
  s.stop(t + decay + 0.05);
  return g;
}
// Envelope points, [seconds from t, value], joined in straight lines.
function env(p: AudioParam, t: number, pts: [number, number][]) {
  p.setValueAtTime(pts[0][1], t + pts[0][0]);
  for (const [at, v] of pts.slice(1)) p.linearRampToValueAtTime(v, t + at);
}

// A made sample played at `t` (louder or softer by `gain`), into `to` (the
// output, an amp, a room); `bend` lets the pitch wheel bend it.
function hit(e: KitEngine, buf: AudioBuffer, t: number, gain = 1, o: { to?: AudioNode; rate?: number; bend?: boolean; pan?: number } = {}) {
  if (warming) return e.ctx.createGain();
  gain *= vel;
  const src = e.ctx.createBufferSource();
  const g = e.ctx.createGain();
  src.buffer = buf;
  src.playbackRate.value = o.rate ?? 1;
  if (o.bend) e.bend?.connect(src.detune);
  g.gain.value = gain * LEVEL;
  let last: AudioNode = src.connect(g);
  if (o.pan) {
    const p = e.ctx.createStereoPanner();
    p.pan.value = o.pan;
    last = last.connect(p);
  }
  last.connect(o.to ?? e.out);
  src.start(t);
  return g;
}
// The step's loudness, for a kit's softer steps (the trip hop cymbal's
// off-beats), set while a pad plays.
let vel = 1;
// The step a pad plays on (for the chords that change through the loop).
let at = 0;
// Every made sample's level (measured in the WAV: at full level the beats
// came out at 0.26 to 0.41, against 0.12 to 0.17 before, squashed by the
// master compressor, and the vocals were set against the old level).
const LEVEL = 0.6;
// A made sample, by name (once per context).
const smp = (e: KitEngine, name: string, secs: number, make: (d: Float32Array, sr: number) => void) => S.sample(e.ctx, name, secs, make);
const hz = (f: number) => Math.round(f * 10) / 10;

// ---- Real recordings --------------------------------------------------------------
// (Joe, 2026-10-21: "find free licencing for all of these options to make
// them sound as exact to the references as possible".) Freely licensed
// recordings, cut into hits and notes in public/samples (CREDITS.md there
// lists every source and licence; the CC BY ones are credited in the
// display). A pad with a recording plays it; one without (or before it has
// loaded) falls back to the made sound below.

// Each kit's recordings: one-shot hits (a pad with several picks one at
// random, never the same twice running), and notes (`midi`: the notes
// recorded, the nearest played and retuned to the note asked for).
type RecKit = { hits: Partial<Record<KitVoice, string[]>>; notes: Partial<Record<KitVoice, { name: string; midi: number[] }>> };
const DI_NOTES = [36, 40, 41, 45, 48];
export const RECORDINGS: Record<Kit, RecKit> = {
  trap: {
    hits: { kick: ["kick"], hat: ["hat"], clap: ["clap"] },
    notes: {},
  },
  metal: {
    hits: { kick: ["kick"], snare: ["snare"], hat: ["crash"], clap: ["keg"] },
    notes: {
      // (The riff: FreePats' Fender recorded straight in, roundwound strings
      // down to C2, two takes of each note, "di-a" and "di-b"; Joe,
      // 2026-10-21: "I want a new present or sound to the guitars ... more
      // like Duality". The lead stays on Emilyguitar's higher notes.)
      synth: { name: "di-a", midi: DI_NOTES },
      animal: { name: "gtr", midi: [37, 40, 42, 45, 48, 51, 54, 57, 60] },
    },
  },
  // (The sirens, police sirens; the ad-libs' voice is the "ah"s, EXTRA.)
  hiphop: {
    hits: { kick: ["kick"], snare: ["snare"], hat: ["hat"], bass: ["siren-0", "siren-1", "siren-2"] },
    notes: { bodhran: { name: "piano", midi: [48, 51, 54, 57, 60, 63] } },
  },
  // (Wandering Star's kit was played live, so its kick is the hip hop kit's
  // acoustic one.)
  triphop: {
    hits: { kick: ["hiphop/kick"], snare: ["snare"], bodhran: ["vinyl"], animal: ["theremin-0", "theremin-1", "theremin-2", "theremin-3", "theremin-4"] },
    notes: {},
  },
  // (The Nac's kick, snare, hat and piano are the trap kit's recordings.)
  florida: {
    hits: { kick: ["trap/kick"], snare: ["trap/snare"], hat: ["trap/hat"] },
    notes: { bodhran: { name: "trap/piano", midi: [48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84] } },
  },
};
// A recording's address: in its kit's folder, or another kit's ("trap/kick").
const recPath = (kit: Kit, name: string) => (name.includes("/") ? `/samples/${name}.flac` : `/samples/${kit}/${name}.flac`);
// The extra recordings a pad layers in (the trap clap's snare).
const EXTRA: Partial<Record<Kit, string[]>> = {
  trap: ["snare"],
  metal: ["hiphop/ahh-0", "hiphop/ahh-1", "hiphop/ahh-2", ...DI_NOTES.map((m) => `di-b-${m}`), "cab-v30"], hiphop: ["rim", "ahh-0", "ahh-1", "ahh-2"], triphop: ["hiphop/rim"] };
// The credit each kit's recordings need (their CC BY sources), shown small
// in the display (Joe, 2026-10-21), linking to public/samples/CREDITS.md.
export const CREDITS: Record<Kit, string> = {
  trap: "Drums: Sonic Pi samples, VCSL, CC0",
  metal: "Drum samples provided by DrumGizmo.org, CC BY 4.0",
  hiphop: "Piano: Salamander Grand Piano, Alexander Holm, CC BY 3.0 · Sirens: OLPC/Berklee sound library, CC BY 3.0",
  triphop: "Theremin: OLPC/Berklee sound library, CC BY 3.0",
  florida: "Piano: Salamander Grand Piano, Alexander Holm, CC BY 3.0",
};
// The decoded recordings, by path (an AudioBuffer plays in any context).
const recs = new Map<string, AudioBuffer>();
const loading = new Map<Kit, Promise<void>>();
let decoder: BaseAudioContext | null = null;
// A kit's recordings fetched and decoded (once; again only if one failed).
export function loadKit(kit: Kit): Promise<void> {
  let p = loading.get(kit);
  if (p) return p;
  decoder ??= new OfflineAudioContext(1, 1, 44100);
  const ctx = decoder;
  const { hits, notes } = RECORDINGS[kit];
  const names = [...new Set([...Object.values(hits).flat(), ...(EXTRA[kit] ?? []), ...Object.values(notes).flatMap((n) => n.midi.map((m) => `${n.name}-${m}`))])];
  p = Promise.all(
    names.map(async (name) => {
      const path = recPath(kit, name);
      if (recs.has(path)) return;
      try {
        const res = await fetch(path);
        if (!res.ok) return;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        // (The hip hop and trip hop kits' through an old sampler's grit, as
        // their records' were; not the voices or the sirens.)
        if (/\/(hiphop|triphop)\/(?!uh|siren|ahh)/.test(path)) for (let c = 0; c < buf.numberOfChannels; c++) S.crunch(buf.getChannelData(c), buf.sampleRate, 22050, 12);
        recs.set(path, buf);
      } catch {
        // (Left to the made sound.)
      }
    }),
  ).then(() => {
    if (names.some((n) => !recs.has(recPath(kit, n)))) loading.delete(kit);
  });
  loading.set(kit, p);
  return p;
}
const lastPick = new Map<string, number>();
function recHit(kit: Kit, v: KitVoice): AudioBuffer | null {
  const list = RECORDINGS[kit].hits[v];
  if (!list?.length) return null;
  let i = Math.floor(Math.random() * list.length);
  const key = kit + v;
  if (list.length > 1 && i === lastPick.get(key)) i = (i + 1) % list.length;
  lastPick.set(key, i);
  return recs.get(recPath(kit, list[i])) ?? null;
}
// The recorded note nearest `f` (Hz), and the rate that retunes it to `f`
// (from another set of the same notes, `as`, if given: a second take).
function recNote(kit: Kit, v: KitVoice, f: number, as?: string): { buf: AudioBuffer; rate: number } | null {
  const n = RECORDINGS[kit].notes[v];
  if (!n) return null;
  const want = 69 + 12 * Math.log2(f / 440);
  const m = n.midi.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
  const buf = recs.get(recPath(kit, `${as ?? n.name}-${m}`));
  return buf ? { buf, rate: f / (440 * 2 ** ((m - 69) / 12)) } : null;
}

// ---- Soundcloud trap ------------------------------------------------------------
// After 1400 / 999 Freestyle: a punchy kick, a crisp snare and a clap in a
// small room, the 808's hat, a long saturated 808 (so it carries on a
// phone), and the "serene" piano riff on a real-sounding piano. The bodhrán
// and the animals are SynthPlayer's own.

const trapRoom = (e: KitEngine) => roomSend(e, "trap-room", 1.2, 0.18);
const trapHall = (e: KitEngine) => roomSend(e, "trap-hall", 3.5, 0.35);
const trap808 = new WeakMap<BaseAudioContext, GainNode>();
// The lead (nothing says what TM88's was; fans play it on a koto, a music
// box or a pluck): a bell-edged pluck, FM's brightness dying in its first
// 150ms, an octave over it, the top rolled off; then its dotted-eighth
// echoes either side and a long hall, as the remakes have it.
function xoLead(e: KitEngine, t: number, note: number) {
  const buf = smp(e, `xo-lead-${hz(note)}`, 1.6, (d, sr) => {
    for (let i = 0; i < d.length; i++) {
      const tt = i / sr;
      const index = 2 * Math.exp(-tt / 0.15);
      d[i] = (Math.sin(2 * Math.PI * note * tt + index * Math.sin(2 * Math.PI * note * 3.5 * tt)) + 0.35 * Math.sin(4 * Math.PI * note * tt)) * Math.exp(-tt / 0.4) * Math.min(1, tt / 0.002);
    }
    const lp = new S.Biquad("lowpass", 3500, 0.7, sr);
    for (let i = 0; i < d.length; i++) d[i] = lp.run(d[i]);
  });
  hit(e, buf, t, 0.42, { bend: true }).connect(trapHall(e));
  const step = e.step ?? 60 / 78 / 4;
  hit(e, buf, t + step * 1.5, 0.13, { pan: 0.6 });
  hit(e, buf, t + step * 3, 0.05, { pan: -0.6 });
}
// The "whale cry": a sine with a little triangle, swelling in, gliding up
// into its octave notes, with a slow vibrato, a half-note echo and a long,
// wet hall.
function whale(e: KitEngine, t: number, note: number) {
  if (warming) return;
  const step = e.step ?? 60 / 78 / 4;
  const len = step * 3.4;
  const high = note > (e.root ?? 61.7) * 4 * 2 ** (24 / 12);
  const g = e.ctx.createGain();
  const lp = e.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2500;
  env(g.gain, t, [[0, 0.0001], [0.06, 0.09 * vel], [len, 0.075 * vel], [len + 0.25, 0.0001]]);
  g.connect(lp).connect(e.out);
  lp.connect(roomSend(e, "trap-whale", 5, 0.5));
  const echo = e.ctx.createDelay(4);
  const eg = e.ctx.createGain();
  echo.delayTime.value = step * 4;
  eg.gain.value = 0.3;
  lp.connect(echo).connect(eg).connect(e.out);
  const vib = e.ctx.createOscillator();
  const vd = e.ctx.createGain();
  vib.frequency.value = 5;
  vd.gain.value = 15;
  vib.connect(vd);
  for (const [type, lvl] of [["sine", 1], ["triangle", 0.25]] as const) {
    const o = e.ctx.createOscillator();
    const og = e.ctx.createGain();
    o.type = type;
    if (high) env(o.frequency, t, [[0, note / 2], [0.05, note]]);
    else o.frequency.value = note;
    og.gain.value = lvl;
    vd.connect(o.detune);
    e.bend?.connect(o.detune);
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + len + 0.3);
  }
  vib.start(t);
  vib.stop(t + len + 0.3);
}
// The tape (the record's "VCR being ejected", the fans' click-clack): a
// cassette's two clicks and its little motor's whirr.
function tape(e: KitEngine, t: number) {
  const step = e.step ?? 60 / 78 / 4;
  const buf = smp(e, `xo-tape-${step.toFixed(4)}`, 0.5, (d, sr) => {
    const rnd = S.seeded(83);
    const second = Math.round(step * 0.625 * sr);
    for (let i = 0; i < d.length; i++) {
      const tt = i / sr;
      const t2 = (i - second) / sr;
      let v = Math.sin(2 * Math.PI * 950 * tt) * Math.exp(-tt / 0.006);
      if (t2 > 0) v += 0.8 * Math.sin(2 * Math.PI * 2100 * t2) * Math.exp(-t2 / 0.005);
      v += (rnd() * 2 - 1) * 0.12 * Math.exp(-tt / 0.08) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 38 * tt));
      d[i] = v;
    }
    const bp = new S.Biquad("highpass", 400, 0.7, sr);
    for (let i = 0; i < d.length; i++) d[i] = bp.run(d[i]);
  });
  hit(e, buf, t, 0.45, { pan: -0.2 });
}
// Returns false for the pads SynthPlayer plays itself.
export function playTrap(e: KitEngine, v: KitVoice, t: number, note: number): boolean {
  if (!warming && playRec(e, "trap", v, t, note)) return true;
  switch (v) {
    case "kick":
      hit(e, smp(e, "trap-kick", 0.5, (d, sr) => S.kick(d, sr, { low: 48, top: 170, drop: 0.03, decay: 0.28, click: 0.35, clickHz: 3500, seed: 11 })), t, 0.82);
      return true;
    case "snare":
      hit(e, smp(e, "trap-snare", 0.5, (d, sr) => S.snare(d, sr, { modes: [[190, 0.09, 0.5], [330, 0.06, 0.25]], wires: 0.9, wireDecay: 0.13, wireHz: 4200, crack: 0.4, seed: 12 })), t, 1.1).connect(trapRoom(e));
      return true;
    case "hat":
      hit(e, smp(e, "trap-hat", 0.2, (d, sr) => S.cymbal808(d, sr, { decay: 0.045, hat: true })), t, 0.72);
      return true;
    case "clap":
      hit(e, smp(e, "trap-clap", 0.6, (d, sr) => S.clap(d, sr, 13)), t, 0.8).connect(trapRoom(e));
      return true;
    case "bass": {
      // The 808: a long sine on its note (its tune), dropping an octave
      // onto it in its first moment, a little saturated so it carries;
      // each note cuts the last.
      const buf = smp(e, `trap-808-${hz(note)}`, 1.8, (d, sr) => {
        let ph = 0;
        for (let i = 0; i < d.length; i++) {
          const tt = i / sr;
          ph += (2 * Math.PI * note * (1 + Math.exp(-tt / 0.015))) / sr;
          d[i] = (Math.tanh(2.5 * Math.sin(ph)) / Math.tanh(2.5)) * Math.exp(-tt / 1.1) * Math.min(1, tt / 0.002);
        }
      });
      trap808.get(e.ctx)?.gain.setTargetAtTime(0, t, 0.02);
      const g = hit(e, buf, t, 0.55, { bend: true });
      if (!warming) trap808.set(e.ctx, g);
      return true;
    }
    case "synth":
      xoLead(e, t, note);
      return true;
    case "bodhran":
      whale(e, t, note);
      return true;
    case "animal":
      tape(e, t);
      return true;
    default:
      return false;
  }
}

// ---- Death metal (Slipknot's Eyeless) ---------------------------------------------
// Drop B, the low string at B1: plucked strings (power chords, palm-muted)
// tracked twice, hard left and right, each through a high-gain amp and a
// 4x12 cabinet; a triggered kick, Joey Jordison's high ringing snare, china
// and crash, the bass, a beer keg, and shouted vocals.

// An uneven drive (a valve's: it clips one side before the other).
function valve(ctx: BaseAudioContext, k: number, bias: number): WaveShaperNode {
  const s = ctx.createWaveShaper();
  const c = new Float32Array(4096);
  const off = Math.tanh(k * bias);
  for (let i = 0; i < c.length; i++) {
    const x = (i / (c.length - 1)) * 2 - 1;
    c[i] = (Math.tanh(k * (x + bias)) - off) / (1 + Math.abs(off));
  }
  s.curve = c;
  s.oversample = "4x";
  return s;
}
// The amp, for a djent tone (Joe, 2026-10-21: "more like a Djent sounding
// guitar, Ibanez, Jackson ... It currently sounds like a bass guitar"): the
// lows cut hard and the middle pushed before the gain (a Tube Screamer in
// front, as those players use), two hot valve stages with the lows
// tightened between them, then the mud cut, the "djent" clank (1.6kHz) and
// the presence lifted, and a bright 4x12 (its top rolling off from 7kHz),
// one for each side.
const GTR_LEVEL = 0.36;
// A buffer at a context's own rate (a convolver takes no other: the
// recordings are decoded at 44.1kHz, and most devices run at 48), by
// linear interpolation (enough for an impulse response).
function atRate(ctx: BaseAudioContext, b: AudioBuffer): AudioBuffer {
  if (b.sampleRate === ctx.sampleRate) return b;
  const k = b.sampleRate / ctx.sampleRate;
  const n = Math.max(1, Math.round(b.length / k));
  const out = ctx.createBuffer(b.numberOfChannels, n, ctx.sampleRate);
  for (let c = 0; c < b.numberOfChannels; c++) {
    const src = b.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const x = i * k;
      const j = Math.floor(x);
      const f = x - j;
      dst[i] = (src[j] ?? 0) * (1 - f) + (src[j + 1] ?? 0) * f;
    }
  }
  return out;
}
// After the real cabinet (matched to Duality's guitars in the WAV).
const CAB_EQ: [BiquadFilterType, number, number, number][] = [
  ["highpass", 45, 0.7, 0],
  ["peaking", 65, 1, 14], // (the low B's fundamental)
  ["peaking", 220, 1, -6],
  ["peaking", 320, 1.4, 4],
  ["peaking", 650, 1.2, 4],
  ["peaking", 3600, 1, 4],
  ["peaking", 5600, 1.2, -5],
  ["highshelf", 7500, 0.7, 18], // (the air the SM57 on a V30 doesn't hear)
  ["peaking", 8500, 1.2, 8],
  ["peaking", 9500, 1, 6],
];
const riffing = new WeakMap<BaseAudioContext, GainNode[]>();
function gtrAmp(e: KitEngine, side: number): AudioNode {
  return once(e.ctx, `metal-amp-${side}`, () => {
    const ctx = e.ctx;
    const chain: AudioNode[] = [];
    const bq = (type: BiquadFilterType, f: number, q: number, g = 0) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      b.gain.value = g;
      chain.push(b);
    };
    const pre = ctx.createGain();
    pre.gain.value = 4;
    chain.push(pre);
    bq("highpass", 160, 0.7);
    bq("highpass", 120, 0.7);
    bq("peaking", 800, 0.8, 8);
    chain.push(valve(ctx, 22, 0.1));
    bq("highpass", 110, 0.7);
    chain.push(drive(ctx, 6));
    bq("peaking", 250, 1, -3);
    bq("peaking", 1800, 1.1, 6); // (the "djent": the pick's pop on a muted chord)
    bq("peaking", 3500, 0.9, 5);
    // The cabinet: a real one when its impulse response has loaded
    // (jesterdyne's Behringer 4x12 with Celestion Vintage 30s and an SM57,
    // CC0), else one made of filters, matched to Duality's guitars.
    const ir = recs.get(recPath("metal", "cab-v30"));
    if (ir) {
      const cab = ctx.createConvolver();
      cab.buffer = atRate(ctx, ir);
      chain.push(cab);
      CAB_EQ.forEach(([type, f, q, g]) => bq(type, f, q, g));
      const lift = ctx.createGain();
      lift.gain.value = 1.9; // (the convolved cabinet came in under the filters': measured in the WAV)
      chain.push(lift);
    } else {
      bq("highpass", 75, 0.7);
      bq("peaking", 90, 1, -5);
      bq("peaking", 170, 0.6, 5);
      bq("lowpass", 5000, 0.7);
      bq("peaking", 10000, 0.7, 6); // (the strings' air over the cabinet's cliff)
    }
    const lvl = ctx.createGain();
    lvl.gain.value = GTR_LEVEL * LEVEL; // (the guitars lead: measured, they came in under the drums)
    chain.push(lvl);
    const pan = ctx.createStereoPanner();
    pan.pan.value = side * 0.85;
    chain.push(pan);
    for (let k = 0; k < chain.length - 1; k++) chain[k].connect(chain[k + 1]);
    pan.connect(e.out);
    return chain[0];
  });
}
function metal(e: KitEngine, v: KitVoice, t: number, note: number) {
  switch (v) {
    case "kick":
      // (Short, so sixteenths of it stay distinct: measured, at a longer
      // boom the double kicks alone were louder than the whole beat should
      // be.)
      hit(e, smp(e, "metal-kick", 0.25, (d, sr) => S.kick(d, sr, { low: 58, top: 140, drop: 0.015, decay: 0.09, click: 1.3, clickHz: 5000, seed: 31 })), t, 0.45);
      break;
    case "snare":
      hit(e, smp(e, "metal-snare", 0.6, (d, sr) => S.snare(d, sr, { modes: [[300, 0.14, 0.55], [520, 0.22, 0.3]], wires: 1, wireDecay: 0.14, wireHz: 5000, crack: 0.7, seed: 32 })), t, 0.98).connect(
        echoSend(e, "metal-echo", 0.12, 0.3, 0.3),
      );
      break;
    case "hat":
      hit(e, smp(e, "metal-china", 1.2, (d, sr) => S.cymbal(d, sr, { decay: 0.9, lo: 2500, hi: 11000, partials: 40, hiss: 0.5, trash: 0.6, seed: 33 })), t, 0.4);
      break;
    case "clap":
      hit(e, smp(e, "metal-crash", 2.4, (d, sr) => S.cymbal(d, sr, { decay: 1.8, lo: 3000, hi: 13000, partials: 50, hiss: 0.6, trash: 0, seed: 34 })), t, 0.38);
      break;
    case "bodhran":
      hit(e, smp(e, "metal-keg", 1, (d, sr) => S.clang(d, sr, { f: 300, seed: 36 })), t, 0.6);
      break;
    case "synth":
      for (const side of [-1, 1])
        hit(e, smp(e, `metal-gtr-${hz(note)}-${side}`, 0.4, (d, sr) => S.powerChord(d, sr, { f: note, ring: 0.22, seed: side < 0 ? 41 : 52 })), t + (side > 0 ? 0.004 : 0), 1, {
          to: gtrAmp(e, side),
          bend: true,
        });
      break;
    case "animal":
      // (The lead, until the recordings load: a plucked string.)
      hit(e, smp(e, `metal-lead-${hz(note)}`, 1.4, (d, sr) => S.pluck(d, sr, { f: note, ring: 1.6, bright: 0.7, seed: 37 })), t, 0.9, { to: gtrAmp(e, 0), bend: true });
      break;
  }
}

// ---- Hip hop (Westside Gunn's Griselda) -------------------------------------------
// Daringer's and Conductor Williams' beats: dusty soul and jazz loops off
// old records, slowed and pitched down, often with no bass and barely any
// drums; 76 to 80bpm (SongBPM's readings of his tracks). A dusty knock, an
// eerie piano loop, a DJ's cuts, a police siren down the street, and his
// shouted ad-libs over the top. Nothing transcribes these beats, so the
// loop and the line are proposals in their way.

// A scratch: a sound dragged back and forth under the needle, the fader
// cutting it between strokes.
function scratch(e: KitEngine, t: number) {
  const o = e.ctx.createOscillator();
  const f = e.ctx.createBiquadFilter();
  const g = e.ctx.createGain();
  o.type = "sawtooth";
  const strokes: [number, number][] = [[0, 280], [0.07, 950], [0.13, 240], [0.21, 1050], [0.3, 200], [0.36, 900], [0.44, 220]];
  env(o.frequency, t, strokes);
  f.type = "bandpass";
  f.Q.value = 2.5;
  env(f.frequency, t, strokes.map(([at, v]) => [at, v * 1.6] as [number, number]));
  env(g.gain, t, [[0, 0.0001], [0.01, 0.5], [0.12, 0.5], [0.125, 0.0001], [0.14, 0.5], [0.29, 0.5], [0.295, 0.0001], [0.31, 0.5], [0.44, 0.4], [0.46, 0.0001]]);
  o.connect(f).connect(g).connect(e.out);
  hiss(e, t, "bandpass", 2500, 0.45, 0.05, 1.5);
  o.start(t);
  o.stop(t + 0.5);
}
// A DJ's cut (S.scratch): one of the shouted "ah"s scratched over a beat,
// in one of the classic cuts, at the tempo; never the same cut twice
// running. False until the "ah"s have loaded (the made scratch then).
const AHHS = ["hiphop/ahh-0", "hiphop/ahh-1", "hiphop/ahh-2"];
const SHOUT_FROM = [0.08, 0.05, 0.15];
const CUTS: Record<string, (s: number) => S.Stroke[]> = {
  // Baby scratches: forward and back on the sixteenths, the fader open.
  baby: (s) => [0, 1, 2, 3].map((k) => ({ at: k * s, dur: s, from: k % 2 ? 0.2 : 0, to: k % 2 ? 0 : 0.2 })),
  // Chirps: the fader shut as each stroke turns back.
  chirp: (s) => [0, 1, 2, 3].map((k) => ({ at: k * s, dur: s, from: k % 2 ? 0.18 : 0, to: k % 2 ? 0 : 0.18, open: [k % 2 ? [0, 0.3] : [0, 0.8]] as [number, number][] })),
  // Transformers: slow strokes, the fader cut in thirty-seconds.
  transformer: (s) => [0, 1].map((k) => ({ at: k * 2 * s, dur: 2 * s, from: k ? 0.35 : 0, to: k ? 0 : 0.35, chops: 4 })),
  // Flares: the fader clicked shut once in each stroke.
  flare: (s) => [0, 1, 2, 3].map((k) => ({ at: k * s, dur: s, from: k % 2 ? 0.22 : 0, to: k % 2 ? 0 : 0.22, open: [[0, 0.42], [0.58, 1]] as [number, number][] })),
};
let lastCut = -1;
function djScratch(e: KitEngine, t: number, gain: number, to?: AudioNode, record?: { name: string; bufs: AudioBuffer[] }): boolean {
  const ahhs = record?.bufs ?? AHHS.map((n) => recs.get(recPath("hiphop", n))).filter((b): b is AudioBuffer => !!b);
  if (!ahhs.length) return false;
  const names = Object.keys(CUTS);
  let c = Math.floor(Math.random() * names.length);
  if (c === lastCut) c = (c + 1) % names.length;
  lastCut = c;
  const a = Math.floor(Math.random() * ahhs.length);
  const step = e.step ?? 60 / 85 / 4;
  const strokes = CUTS[names[c]](step);
  const src = ahhs[a];
  const secs = Math.max(...strokes.map((x) => x.at + x.dur)) + 0.02;
  const buf = smp(e, `scr-${record?.name ?? "ahh"}-${names[c]}-${a}-${step.toFixed(4)}`, secs, (d, sr) => S.scratch(d, sr, src.getChannelData(0), src.sampleRate, strokes, 90 + c));
  hit(e, buf, t, gain, { to });
  return true;
}
// A police siren down the street: thin, in its echo, a new one cutting the
// last off.
const sirens = new WeakMap<BaseAudioContext, GainNode>();
function siren(e: KitEngine, buf: AudioBuffer, t: number, gain: number) {
  const far = once(e.ctx, "siren-far", () => {
    const hp = e.ctx.createBiquadFilter();
    const lp = e.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;
    lp.type = "lowpass";
    lp.frequency.value = 3600;
    hp.connect(lp).connect(e.out);
    lp.connect(roomSend(e, "siren-room", 2.8, 0.45));
    return hp;
  });
  sirens.get(e.ctx)?.gain.setTargetAtTime(0, t, 0.08);
  const g = hit(e, buf, t, gain, { to: far });
  sirens.set(e.ctx, g);
}

// The made siren (until the recordings load): a wail up and down.
function madeSiren(e: KitEngine, t: number) {
  const o = e.ctx.createOscillator();
  const g = e.ctx.createGain();
  o.type = "square";
  env(o.frequency, t, [[0, 650], [1.2, 1300], [2.4, 650]]);
  env(g.gain, t, [[0, 0.0001], [0.3, 0.05], [2.1, 0.05], [2.4, 0.0001]]);
  o.connect(g).connect(e.out);
  o.start(t);
  o.stop(t + 2.5);
}
function hiphop(e: KitEngine, v: KitVoice, t: number) {
  switch (v) {
    case "kick":
      hit(e, smp(e, "hip-kick", 0.5, (d, sr) => S.crunch((S.kick(d, sr, { low: 50, top: 115, drop: 0.035, decay: 0.32, click: 0.25, clickHz: 2500, seed: 61 }), d), sr)), t, 0.78);
      break;
    case "snare":
      hit(e, smp(e, "hip-snare", 0.5, (d, sr) => S.crunch((S.snare(d, sr, { modes: [[185, 0.1, 0.6], [290, 0.07, 0.25]], wires: 0.7, wireDecay: 0.16, wireHz: 3000, crack: 0.3, seed: 62 }), d), sr)), t, 1.08);
      break;
    case "hat":
      hit(e, smp(e, "hip-hat", 0.15, (d, sr) => S.crunch((S.cymbal(d, sr, { decay: 0.05, lo: 5000, hi: 12000, partials: 24, hiss: 0.4, trash: 0, seed: 63 }), d), sr)), t, 0.35);
      break;
    case "bass":
      madeSiren(e, t);
      break;
  }
}

// ---- Westside Gunn's ad-libs ----------------------------------------------------------
// His "bo bo bo bo BOOM", DOOT-DOOT-DOOT-DOOT-DOOT-DOOT-DOOT, BRRRRT, "eh
// yo" and the long "AYYYOOO" that opens a record: machine guns and police
// chases, shouted as punctuation at the end of a line. Nobody's real voice
// is used: they're a man's shouted "ah"s (CC0), shaped syllable by
// syllable by a moving filter, double-tracked either side, nasal and
// hard-compressed. Measured from the acapellas Joe sent (2026-10-21; not
// used in the machine, as they're his records): a high shout, 300 to
// 400Hz (a shriek near 590Hz), on sixteenths, each syllable 90 to 200ms
// and sliding up or down a little, the last BOOM held half a second, the
// "ayo" stretched over a second and a half. A run fits what's left of the
// bar (`at`), never the same twice running.
type Lib = "boom" | "doot" | "brrt" | "ayo" | "ehyo";
const LIB_STEPS: Record<Lib, number> = { boom: 7, doot: 7, brrt: 3, ayo: 7, ehyo: 2 };
let lastLib: Lib | null = null;
function adlibChain(e: KitEngine): AudioNode {
  return once(e.ctx, "hip-adlib", () => {
    const ctx = e.ctx;
    const input = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -26;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;
    const makeup = ctx.createGain();
    makeup.gain.value = 0.85;
    const bq = (type: BiquadFilterType, f: number, q: number, gain = 0) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      b.gain.value = gain;
      return b;
    };
    const last = input.connect(bq("highpass", 250, 0.7)).connect(bq("peaking", 1250, 1, 5)).connect(bq("peaking", 3500, 1, 4)).connect(comp).connect(makeup);
    last.connect(e.out);
    // (A slap off the wall.)
    const slap = ctx.createDelay(0.5);
    slap.delayTime.value = 0.075;
    const sg = ctx.createGain();
    sg.gain.value = 0.2;
    last.connect(slap).connect(sg).connect(e.out);
    return input;
  });
}
// One syllable of a voice: `rate` its pitch, the filter's path (`lp`: its
// cutoff over the syllable, as [seconds, Hz]) and the loudness's (`amp`).
function syllable(e: KitEngine, buf: AudioBuffer, t: number, o: { rate: number | [number, number]; dur: number; lp: [number, number][]; amp: [number, number][]; q?: number; pan: number; from?: number }) {
  if (warming) return;
  const src = e.ctx.createBufferSource();
  const f = e.ctx.createBiquadFilter();
  const g = e.ctx.createGain();
  const p = e.ctx.createStereoPanner();
  src.buffer = buf;
  if (Array.isArray(o.rate)) {
    src.playbackRate.setValueAtTime(o.rate[0], t);
    src.playbackRate.linearRampToValueAtTime(o.rate[1], t + o.dur);
  } else src.playbackRate.value = o.rate;
  f.type = "lowpass";
  f.Q.value = o.q ?? 3;
  env(f.frequency, t, o.lp);
  env(g.gain, t, o.amp.map(([a, v]) => [a, Math.max(0.0001, v * vel)]));
  p.pan.value = o.pan;
  src.connect(f).connect(g).connect(p).connect(adlibChain(e));
  src.start(t, o.from ?? 0.01);
  src.stop(t + o.dur + 0.02);
}
function adlib(e: KitEngine, t: number): boolean {
  const voices = AHHS.map((n) => recs.get(recPath("hiphop", n))).filter((b): b is AudioBuffer => !!b);
  if (!voices.length) return false;
  const left = 16 - (at % 16);
  let picks = (Object.keys(LIB_STEPS) as Lib[]).filter((l) => LIB_STEPS[l] <= left && l !== lastLib);
  if (!picks.length) picks = ["ehyo"];
  const lib = picks[Math.floor(Math.random() * picks.length)];
  lastLib = lib;
  const step = e.step ?? 60 / 78 / 4;
  // (The short, sharp "AH!" for the quick syllables; the long held shout
  // for the "ayo".)
  const pick = Math.floor(Math.random() * Math.min(2, voices.length));
  const short = voices[pick];
  const long = voices[voices.length - 1];
  // (Each shout opens with a squeal, 600 to 770Hz, before it settles near
  // 390: the syllables start past it.)
  const from = SHOUT_FROM[pick];
  const longFrom = SHOUT_FROM[voices.length - 1];
  const shriek = Math.random() < 0.35;
  // Twice, a hair apart, either side.
  for (const side of [-1, 1]) {
    const late = side > 0 ? 0.011 : 0;
    // (The "ah"s are about 400Hz: brought down to his 330 or so.)
    const up = (side > 0 ? 1.012 : 1) * 0.84;
    const pan = side * 0.3;
    if (lib === "boom") {
      // Four short "bo"s, each sliding up, then the BOOM held and falling
      // into its "m".
      for (let k = 0; k < 4; k++) {
        const d = step * 0.72;
        syllable(e, short, t + k * step + late, { from, rate: [0.96 * up, 1.06 * up], dur: d, pan, lp: [[0, 600], [0.015, 1250], [d * 0.6, 1000], [d, 500]], amp: [[0, 0.0001], [0.008, 1], [d * 0.6, 0.8], [d, 0.0001]] });
      }
      const d = Math.min(0.55, step * 2.8);
      syllable(e, long, t + 4 * step + late, { from: longFrom, rate: [1.06 * up, 0.92 * up], dur: d, pan, lp: [[0, 600], [0.02, 1300], [d * 0.55, 1000], [d * 0.8, 420], [d, 320]], amp: [[0, 0.0001], [0.01, 1.2], [d * 0.55, 1], [d * 0.8, 0.45], [d, 0.0001]] });
    } else if (lib === "doot")
      for (let k = 0; k < 7; k++) {
        const hard = k === 6;
        const d = step * (hard ? 1.6 : 0.6);
        const at0 = t + k * step + late;
        syllable(e, short, at0, { from, rate: hard ? [1.1 * up, 1.02 * up] : [0.98 * up, 1.04 * up], dur: d, pan, lp: [[0, 2600], [0.012, 1200], [d * 0.7, 1000], [d * 0.72, 900]], amp: [[0, 0.0001], [0.003, hard ? 1.3 : 1], [d * 0.7, hard ? 1.1 : 0.85], [d * 0.72, 0.0001], [d, 0.0001]] });
        if (side < 0) hiss(e, at0 + d * 0.72, "highpass", 3500, 0.025, 0.1 * vel, 0.8, adlibChain(e)); // (the t)
      }
    else if (lib === "brrt") {
      // A rolled r: the voice fluttering at 26 a second.
      const d = step * 3.2;
      if (!warming) {
        const src = e.ctx.createBufferSource();
        const f = e.ctx.createBiquadFilter();
        const g = e.ctx.createGain();
        const lfo = e.ctx.createOscillator();
        const depth = e.ctx.createGain();
        const p = e.ctx.createStereoPanner();
        src.buffer = long;
        src.playbackRate.value = up;
        f.type = "bandpass";
        f.frequency.value = 1150;
        f.Q.value = 0.8;
        lfo.type = "square";
        lfo.frequency.value = 26;
        depth.gain.value = 0.45 * vel;
        env(g.gain, t + late, [[0, 0.0001], [0.01, 0.55 * vel], [d * 0.8, 0.5 * vel], [d, 0.0001]]);
        lfo.connect(depth).connect(g.gain);
        p.pan.value = pan;
        src.connect(f).connect(g).connect(p).connect(adlibChain(e));
        src.start(t + late, longFrom);
        lfo.start(t + late);
        src.stop(t + late + d + 0.02);
        lfo.stop(t + late + d + 0.02);
      }
    } else if (lib === "ayo") {
      // "AYYYOOO": the held shout stretched, rising as it opens out of the
      // "a" into a long "o", now and then a shriek an octave-ish higher.
      // (Held about 290Hz, or the shriek near 590Hz, as his are.)
      const hi = shriek ? 1.6 : 0.88;
      const d = Math.min(1.7, step * 8);
      syllable(e, long, t + late, { rate: [0.9 * hi * up, 1.02 * hi * up], dur: d, pan, q: 2.5, lp: [[0, 1900], [d * 0.3, 1700], [d * 0.45, 950], [d, 750]], amp: [[0, 0.0001], [0.02, 1], [d * 0.8, 0.85], [d, 0.0001]], from: longFrom });
    } else {
      // "Eh-yo": an open "eh", then the voice rising into a "yo" and falling.
      const d1 = step * 0.7;
      const d2 = step * 1.2;
      syllable(e, short, t + late, { from, rate: 1.02 * up, dur: d1, pan, q: 2, lp: [[0, 2000], [d1, 1800]], amp: [[0, 0.0001], [0.008, 1], [d1 * 0.8, 0.8], [d1, 0.3]] });
      syllable(e, short, t + late + d1 * 0.9, { from: from + 0.1, rate: [1.12 * up, 0.96 * up], dur: d2, pan, q: 2.5, lp: [[0, 1400], [d2 * 0.4, 850], [d2, 650]], amp: [[0, 0.3], [0.03, 1], [d2 * 0.7, 0.8], [d2, 0.0001]] });
    }
  }
  return true;
}

// ---- Trip hop (Portishead's Wandering Star) ---------------------------------------
// From both Songsterr transcriptions (they agree): 80bpm, B minor, swung in
// triplets; Clive Deamer's kit played live (kick, snare with a side stick,
// ride), the bass on the beats over Bm, Bm, G/B and F#/A#, Gary Baldwin's
// Hammond, a guitar's high whine trilling F# and F, and Geoff Barrow's
// scratches at the end of every other bar (he cut the start of War's
// "Magic Mountain", its harmonica). On Dummy, the drums were taped, cut to
// vinyl, the records walked on and kicked about, then sampled (mono): the
// sound is in the middle, the deep lows and the top gone.

// A worn sound, for a whole kit (Joe, 2026-10-21: trip hop "needs to be
// more low fi"): a tape's saturation, its wow (a slow sway in pitch: trip
// hop 0.5Hz, about 8 cents; hip hop 0.3Hz, 12) and flutter, firm
// compression, the lows thinned, the middle lifted a little and the top
// rolled off as off a worn record. (Each sound is also through an old
// sampler's grit, 22kHz and 12 bits.)
const WORN = {
  hiphop: { hp: 120, lp: 4500, wow: [0.3, 0.0037], flutter: [7, 0.00004], level: 0.62 },
  triphop: { hp: 80, lp: 5200, wow: [0.5, 0.0015], flutter: [6.5, 0.000026], level: 0.8 },
};
function lofi(e: KitEngine, kit: "hiphop" | "triphop"): AudioNode {
  return once(e.ctx, `${kit}-lofi`, () => {
    const w = WORN[kit];
    const ctx = e.ctx;
    const input = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = w.hp;
    const wow = ctx.createDelay(0.05);
    wow.delayTime.value = 0.01;
    for (const [f, depth] of [w.wow, w.flutter]) {
      const lfo = ctx.createOscillator();
      const g = ctx.createGain();
      lfo.frequency.value = f;
      g.gain.value = depth;
      lfo.connect(g).connect(wow.delayTime);
      lfo.start();
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.12;
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 2200;
    mid.gain.value = 2;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = w.lp;
    lp.Q.value = 0.5;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = w.lp * 1.45;
    const lvl = ctx.createGain();
    lvl.gain.value = w.level; // (the saturation lifts it: measured against the other kits)
    input.connect(hp).connect(drive(ctx, 1.7)).connect(wow).connect(comp).connect(mid).connect(lp).connect(lp2).connect(lvl).connect(e.out);
    return input;
  });
}
// The Hammond: drawbars 16', 5 1/3' and 8' (888) on each note of the chord,
// held to the next one, through a slow Leslie (a sway in pitch and level)
// and a little of its amp's breakup.
function hammond(e: KitEngine, t: number, notes: number[], len: number) {
  const out = once(e.ctx, "trip-organ", () => {
    const ctx = e.ctx;
    const trem = ctx.createGain();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    trem.gain.value = 0.8;
    lfo.frequency.value = 0.8;
    depth.gain.value = 0.2;
    lfo.connect(depth).connect(trem.gain);
    lfo.start();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    const lvl = ctx.createGain();
    lvl.gain.value = 0.45;
    trem.connect(drive(ctx, 1.6)).connect(lp).connect(lvl).connect(e.out);
    return trem;
  });
  if (warming) return;
  const g = e.ctx.createGain();
  const peak = 0.05 * vel;
  env(g.gain, t, [[0, 0.0001], [0.05, peak], [len, peak], [len + 0.12, 0.0001]]);
  g.connect(out);
  const sway = e.ctx.createOscillator();
  const sd = e.ctx.createGain();
  sway.frequency.value = 0.8;
  sd.gain.value = 7;
  sway.connect(sd);
  for (const f of notes)
    for (const [m, lvl] of [[0.5, 1], [1.5, 0.8], [1, 1]]) {
      const o = e.ctx.createOscillator();
      const og = e.ctx.createGain();
      o.frequency.value = f * m;
      og.gain.value = lvl;
      sd.connect(o.detune);
      e.bend?.connect(o.detune);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + len + 0.15);
    }
  sway.start(t);
  sway.stop(t + len + 0.15);
}
// The guitar's whine: feedback-like, near a sine with a little of its
// octave, a slow vibrato, each note running into the next.
function whine(e: KitEngine, t: number, f: number) {
  const len = (e.step ?? 60 / 80 / 4) * 1.05;
  const g = e.ctx.createGain();
  const peak = 0.06 * vel;
  env(g.gain, t, [[0, 0.0001], [0.025, peak], [len, peak * 0.9], [len + 0.04, 0.0001]]);
  g.connect(e.out);
  g.connect(roomSend(e, "trip-room", 2.2, 0.25));
  const vib = e.ctx.createOscillator();
  const vd = e.ctx.createGain();
  vib.frequency.value = 5.5;
  vd.gain.value = 12;
  vib.connect(vd);
  for (const [m, lvl] of [[1, 1], [2, 0.25]]) {
    const o = e.ctx.createOscillator();
    const og = e.ctx.createGain();
    o.frequency.value = f * m;
    og.gain.value = lvl;
    vd.connect(o.detune);
    e.bend?.connect(o.detune);
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + len + 0.06);
  }
  vib.start(t);
  vib.stop(t + len + 0.06);
}
// Barrow's record to scratch: a harmonica's phrase (a reed, its middle
// honking, bending up into B4, then D5 and back), made.
function harp(e: KitEngine): AudioBuffer {
  return smp(e, "trip-harp", 1, (d, sr) => {
    const path: [number, number][] = [[0, 440], [0.06, 494], [0.3, 494], [0.36, 587], [0.6, 587], [0.66, 494], [1, 494]];
    let ph = 0;
    let k = 0;
    for (let i = 0; i < d.length; i++) {
      const tt = i / sr;
      while (k < path.length - 2 && tt > path[k + 1][0]) k++;
      const [a, fa] = path[k];
      const [b, fb] = path[k + 1];
      const f = (fa + ((fb - fa) * Math.min(1, (tt - a) / (b - a || 1)))) * (1 + 0.006 * Math.sin(2 * Math.PI * 5 * tt));
      ph += (2 * Math.PI * f) / sr;
      let v = 0;
      for (let h = 1; h <= 12; h++) {
        const hz = f * h;
        v += (Math.sin(ph * h) / h) * (h % 2 ? 1 : 0.5) * (0.3 + 1 / (1 + ((hz - 1400) / 700) ** 2));
      }
      d[i] = v * 0.35 * Math.min(1, tt / 0.02) * Math.min(1, (1 - tt) / 0.05);
    }
  });
}
function triphop(e: KitEngine, v: KitVoice, t: number, note: number) {
  const room = roomSend(e, "trip-room", 2.2, 0.25);
  const step = e.step ?? 60 / 80 / 4;
  switch (v) {
    case "kick":
      hit(e, smp(e, "trip-kick", 0.6, (d, sr) => S.crunch((S.kick(d, sr, { low: 52, top: 120, drop: 0.03, decay: 0.3, click: 0.2, clickHz: 2200, seed: 74 }), d), sr, 22050, 12)), t, 0.9);
      break;
    case "snare":
      hit(e, smp(e, "trip-snare", 0.6, (d, sr) => S.crunch((S.snare(d, sr, { modes: [[175, 0.12, 0.5]], wires: 0.6, wireDecay: 0.2, wireHz: 2600, crack: 0.2, seed: 71 }), d), sr, 22050, 12)), t, 0.93).connect(room);
      break;
    case "hat":
      // The ride.
      hit(e, smp(e, "trip-ride", 1.6, (d, sr) => S.crunch((S.cymbal(d, sr, { decay: 1.3, lo: 2800, hi: 9000, partials: 40, hiss: 0.25, trash: 0, seed: 73 }), d), sr, 22050, 12)), t, 0.3);
      break;
    case "clap": {
      // Barrow's scratches, on the harmonica.
      const h = harp(e);
      djScratch(e, t, 0.75, undefined, { name: "harp", bufs: [h] });
      break;
    }
    case "bass": {
      // A round bass, a little driven, held two or three steps.
      const { o } = tone(e, t, "triangle", note * 1.01, note, 0.03, step * 2.6, 0.5 * vel);
      e.bend?.connect(o.detune);
      tone(e, t, "sine", note, note, 0, step * 2.6, 0.1 * vel);
      break;
    }
    case "bodhran":
      bed(e, smp(e, "trip-vinyl", 1, (d, sr) => S.crackle(d, sr, 72)), t, 16, 0.4);
      break;
    case "synth":
      hammond(e, t, chordHz(e, "triphop", "synth"), step * (CHORDS.triphop?.synth?.per ?? 8));
      break;
    case "animal":
      // (The theremin, until its recordings load: a whine, near a sine.)
      whine(e, t, note);
      break;
  }
}

// ---- Squeals (Joe, 2026-10-21: "This is how I want the guitar to
// sound", Brendon Padjasek of Structures, "5 Metalcore GUITAR Sounds YOU
// NEED for Djent, Thall and Deathcore", on an Ibanez RG8 through an amp
// sim): his five noises, one a hit, never the same twice running, made as
// the guitar makes them and played through the same amps. A pinch
// harmonic (a high partial of the low string, its vibrato widening), an
// upward pick scrape (the pick ratcheting faster up the wound string), the
// "helicopter" (the pick rocked along it), an octave tap harmonic (a
// chime), and the "cat scratch" (a harmonic sliding up and down).
type Squeal = "harmonic" | "scrape" | "helicopter" | "tap" | "cat";
const SQUEALS: Squeal[] = ["harmonic", "scrape", "helicopter", "tap", "cat"];
let lastSqueal = -1;
// A pick along a wound string: a click for every winding it crosses, at
// `rate(t)` a second, ringing at the string's pitch through the pickup.
function ratchet(d: Float32Array, sr: number, rate: (t: number) => number, seed: number) {
  const rnd = S.seeded(seed);
  let ph = 0;
  let ring = 0;
  let ring2 = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    ph += rate(t) / sr;
    const click = ph >= 1 ? 1 : 0;
    if (click) ph -= 1;
    // (Two resonances that rise with the speed, as the scrape's pitch does.)
    const f = Math.min(4000, 500 + rate(t) * 3);
    ring = ring * 0.93 + click * (0.6 + 0.4 * rnd()) - ring2 * (2 * Math.PI * f / sr) * 0.5;
    ring2 += ring * (2 * Math.PI * f / sr);
    d[i] = ring2 * 0.5 + (rnd() * 2 - 1) * 0.04 * Math.min(1, rate(t) / 300);
  }
  const fade = Math.round(0.03 * sr);
  for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
  let peak = 0;
  for (const v of d) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.8 / peak;
}
function squeal(e: KitEngine, t: number, low: number) {
  // (A tune above the low strings is a pinch harmonic on that note,
  // Duality's; otherwise one of the five noises, off the low string.)
  const pinched = low > 300;
  let k = Math.floor(Math.random() * SQUEALS.length);
  if (k === lastSqueal) k = (k + 1) % SQUEALS.length;
  if (!pinched) lastSqueal = k;
  const kind = pinched ? "harmonic" : SQUEALS[k];
  const into = (node: AudioNode) => {
    node.connect(gtrAmp(e, -1));
    node.connect(gtrAmp(e, 1));
  };
  // A high, nearly pure tone (a harmonic) along a pitch path, in cents
  // against `f`, with a vibrato that widens.
  const tone = (f: number, len: number, path: [number, number][], vib: number, peak: number) => {
    if (warming) return;
    const o = e.ctx.createOscillator();
    const o2 = e.ctx.createOscillator();
    const g = e.ctx.createGain();
    const g2 = e.ctx.createGain();
    const lfo = e.ctx.createOscillator();
    const depth = e.ctx.createGain();
    o.frequency.value = f;
    o2.frequency.value = f * 2;
    g2.gain.value = 0.2;
    env(o.detune, t, path);
    env(o2.detune, t, path);
    lfo.frequency.value = 6.2;
    env(depth.gain, t, [[0, 0], [0.12, 0], [len, vib]]);
    lfo.connect(depth);
    depth.connect(o.detune);
    depth.connect(o2.detune);
    e.bend?.connect(o.detune);
    e.bend?.connect(o2.detune);
    env(g.gain, t, [[0, 0.0001], [0.004, peak * vel], [len * 0.7, peak * 0.8 * vel], [len, 0.0001]]);
    o.connect(g);
    o2.connect(g2).connect(g);
    into(g);
    for (const n of [o, o2, lfo]) {
      n.start(t);
      n.stop(t + len + 0.05);
    }
  };
  const pick = () => {
    const g = e.ctx.createGain();
    g.gain.value = 1;
    into(g);
    hiss(e, t, "bandpass", 3200, 0.008, 0.6 * vel, 1.2, g);
  };
  if (kind === "harmonic" && pinched) {
    // (Held five steps, into the next bar, bent up a tone on the last.)
    const step = e.step ?? 60 / 146 / 4;
    const len = step * 5;
    pick();
    tone(low, len, [[0, -40], [0.04, 0], [len - step, 0], [len, 200]], 30, 0.5);
  } else if (kind === "harmonic") {
    // (The low string's sixth partial, pinched: F#4 off B1.)
    pick();
    tone(low * 6, 0.9, [[0, -60], [0.06, 0], [0.25, 100], [0.9, 100]], 45, 0.5);
  } else if (kind === "tap") {
    // (Tapped an octave over the fretted note: its partials chime.)
    tone(low * 8, 1.4, [[0, 0], [1.4, 0]], 15, 0.4);
    tone(low * 12, 1, [[0, 0], [1, 0]], 10, 0.2);
  } else if (kind === "cat") {
    // (A harmonic sliding up a fifth, then down past where it began.)
    pick();
    tone(low * 6, 0.75, [[0, 0], [0.15, 700], [0.35, 600], [0.7, -500], [0.75, -600]], 35, 0.45);
  } else {
    const len = kind === "scrape" ? 0.55 : 0.9;
    const buf = smp(e, `metal-${kind}`, len, (d, sr) =>
      ratchet(d, sr, kind === "scrape" ? (tt) => 90 + 1100 * (tt / len) ** 1.6 : (tt) => 420 + 300 * Math.sin(2 * Math.PI * 13 * tt), kind === "scrape" ? 91 : 92),
    );
    if (warming) return;
    const src = e.ctx.createBufferSource();
    const g = e.ctx.createGain();
    src.buffer = buf;
    g.gain.value = 0.9 * vel;
    src.connect(g);
    into(g);
    src.start(t);
  }
}

// The lead guitar: the recorded strings ringing (not muted), each note
// sliding in from a little under and its vibrato widening as it's held, in
// the middle through its own amp, with an echo and some room; a new note
// cuts the last, as on one string.
const leads = new WeakMap<BaseAudioContext, GainNode>();
function lead(e: KitEngine, t: number, note: number): boolean {
  const r = recNote("metal", "animal", note);
  if (!r) return false;
  if (warming) return true;
  const amp = gtrAmp(e, 0);
  const src = e.ctx.createBufferSource();
  const g = e.ctx.createGain();
  const lfo = e.ctx.createOscillator();
  const depth = e.ctx.createGain();
  src.buffer = r.buf;
  src.playbackRate.value = r.rate;
  env(src.detune, t, [[0, -120], [0.045, 0]]);
  lfo.frequency.value = 5.6;
  env(depth.gain, t, [[0, 0], [0.18, 0], [1.2, 30]]);
  lfo.connect(depth).connect(src.detune);
  e.bend?.connect(src.detune);
  env(g.gain, t, [[0, 0.0001], [0.006, 1.15 * vel], [1.6, 0.8 * vel]]);
  leads.get(e.ctx)?.gain.setTargetAtTime(0, t, 0.015);
  leads.set(e.ctx, g);
  src.connect(g).connect(amp);
  g.connect(echoSend(e, "metal-lead-echo", 0.33, 0.3, 0.12));
  g.connect(roomSend(e, "metal-room", 0.8, 0.15));
  src.start(t);
  lfo.start(t);
  src.stop(t + 2);
  lfo.stop(t + 2);
  return true;
}

// A pad from its recording, through the kit's amps, rooms and echoes;
// false where there's none (yet), or the pad is made, for the made sound.
function playRec(e: KitEngine, kit: Kit, v: KitVoice, t: number, note: number): boolean {
  // (`send`: a room or echo as well as the output; `to`: an amp or filter
  // instead.)
  type Route = { send?: AudioNode; to?: AudioNode; rate?: number };
  const route = (g: GainNode, o: Route) => {
    if (o.send) g.connect(o.send);
    return g;
  };
  const one = (gain: number, o: Route = {}) => {
    const b = recHit(kit, v);
    if (!b) return false;
    route(hit(e, b, t, gain, { to: o.to, rate: o.rate }), o);
    return true;
  };
  const named = (name: string, gain: number, o: Route = {}) => {
    const b = recs.get(recPath(kit, name));
    if (b) route(hit(e, b, t, gain, { to: o.to, rate: o.rate }), o);
    return !!b;
  };
  const tuned = (gain: number, o: Route = {}, f = note, voice = v, at = t) => {
    const r = recNote(kit, voice, f);
    if (!r) return null;
    return route(hit(e, r.buf, at, gain, { to: o.to, rate: r.rate, bend: true }), o);
  };
  if (kit === "trap") {
    if (v === "kick") return one(1.6);
    if (v === "hat") {
      const b = recHit(kit, v);
      if (!b) return false;
      // A soft step is a roll: three hats in the step.
      if (vel < 1 && e.step) {
        for (let k = 0; k < 3; k++) {
          vel = 0.5 + 0.2 * k;
          hit(e, b, t + (k * e.step) / 3, 0.5);
        }
      } else hit(e, b, t, 0.5);
      return true;
    }
    if (v === "clap") {
      // A clap layered over the snare (the trap backbeat), in the room.
      const ok = one(0.8, { send: trapRoom(e) });
      named("snare", 0.55, { send: trapRoom(e) });
      return ok;
    }
    return false;
  }
  if (kit === "metal") {
    if (v === "kick") return one(1.55);
    if (v === "snare") return one(1.4, { send: echoSend(e, "metal-echo", 0.12, 0.3, 0.3) });
    if (v === "hat") return one(0.65);
    if (v === "clap") return one(0.9);
    if (v === "animal") return lead(e, t, note);
    if (v === "bodhran") {
      squeal(e, t, note);
      return true;
    }
    if (v === "synth") {
      // A power chord (root and fifth, as Mick Thomson and Jim Root play
      // them) from the recorded strings, quad-tracked as metal records are
      // (a pair hard left and right, a second pair a little in and a hair
      // later, each take a few cents apart), each into its amp. Open, it
      // rings its steps (`hold`) and is stopped dead; a soft step is
      // palm-muted: bright as the pick strikes, damped fast. Each chord
      // cuts the last. (The bass an octave under it went: it made the
      // guitar sound like a bass.)
      if (!recNote(kit, v, note)) return false;
      const muted = vel < 1;
      const step = e.step ?? 60 / 146 / 4;
      const ring = muted ? 0.07 : holdAt(kit, v, 2) * step - 0.02;
      for (const g of riffing.get(e.ctx) ?? []) g.gain.setTargetAtTime(0, t, 0.008);
      const takes: GainNode[] = [];
      for (const [side, late, cents, lvl] of [[-1, 0, -4, 1], [1, 0.006, 4, 1], [-0.6, 0.011, 7, 0.6], [0.6, 0.016, -7, 0.6]]) {
        const mute = e.ctx.createBiquadFilter();
        const g = e.ctx.createGain();
        mute.type = "lowpass";
        mute.Q.value = 0.9;
        const at = t + late;
        mute.frequency.setValueAtTime(7500, at);
        mute.frequency.setTargetAtTime(muted ? 2000 : 4500, at + 0.008, muted ? 0.025 : 0.08);
        g.gain.setValueAtTime(lvl * (muted ? 0.85 : 1), at);
        g.gain.setTargetAtTime(0.0001, at + ring, muted ? 0.018 : 0.012);
        mute.connect(g).connect(gtrAmp(e, side));
        takes.push(g);
        hiss(e, at, "bandpass", 3200, 0.006, 0.5 * lvl, 1.2, gtrAmp(e, side));
        for (const semis of [0, 7]) {
          // (The left guitars one take, the right the other.)
          const r = recNote(kit, v, note * 2 ** (semis / 12), side > 0 ? "di-b" : undefined) ?? recNote(kit, v, note * 2 ** (semis / 12));
          if (!r) continue;
          const src = e.ctx.createBufferSource();
          src.buffer = r.buf;
          src.playbackRate.value = r.rate;
          src.detune.value = cents;
          e.bend?.connect(src.detune);
          src.connect(mute);
          src.start(at);
          src.stop(at + ring + 0.15);
        }
      }
      if (!warming) riffing.set(e.ctx, takes);
      return true;
    }
    return false;
  }
  if (kit === "hiphop") {
    if (v === "kick") return one(1.4);
    if (v === "snare") {
      // A dry snare with its rim shot in it.
      const ok = one(1);
      named("rim", 0.4);
      return ok;
    }
    if (v === "hat") return one(0.45); // (ghosts, barely there)
    if (v === "bass") {
      const b = recHit(kit, v);
      if (b) siren(e, b, t, 0.55);
      return !!b;
    }
    if (v === "animal") return adlib(e, t);
    if (v === "bodhran") {
      // The loop's chord on the piano, muffled, with the record's crackle
      // under it for the half bar.
      let ok = false;
      for (const f of chordHz(e, kit, v)) ok = !!tuned(0.24, { to: muffle(e) }, f) || ok;
      if (ok) bed(e, smp(e, "hip-vinyl", 1, (d, sr) => S.crackle(d, sr, 65)), t, 8, 0.45);
      return ok;
    }
    return false;
  }
  if (kit === "florida") {
    if (v === "kick") return one(1.6);
    if (v === "snare") return one(1.1, { to: nacGrit(e), send: nacRoom(e) });
    if (v === "hat") {
      const b = recHit(kit, v);
      if (!b) return false;
      // A soft step is a roll: three hats in the step, rising.
      if (vel < 1 && e.step) {
        for (let k = 0; k < 3; k++) {
          vel = 0.45 + 0.2 * k;
          hit(e, b, t + (k * e.step) / 3, 0.5, { pan: 0.15 });
        }
      } else hit(e, b, t, 0.5, { pan: 0.15 });
      return true;
    }
    if (v === "bodhran") {
      // The low piano, doubled an octave down.
      const g = tuned(0.5, { send: nacRoom(e) });
      tuned(0.3, {}, note / 2);
      return !!g;
    }
    return false;
  }
  // Trip hop.
  if (v === "kick") return one(1.5);
  if (v === "snare") {
    // The snare with a side stick in it (as both tabs have it).
    const ok = one(1.2, { send: roomSend(e, "trip-room", 2.2, 0.25) });
    named("hiphop/rim", 0.45);
    return ok;
  }
  if (v === "bodhran") {
    const b = recHit(kit, v);
    if (b) bed(e, b, t, 16, 0.3);
    return !!b;
  }
  // (A theremin's phrase, in the room.)
  if (v === "animal") return one(0.5, { send: roomSend(e, "trip-room", 2.2, 0.25) });
  return false;
}
// A record's crackle, looped under the next `steps` steps.
function bed(e: KitEngine, b: AudioBuffer, t: number, steps: number, gain: number) {
  if (warming) return;
  const src = e.ctx.createBufferSource();
  const g = e.ctx.createGain();
  src.buffer = b;
  src.loop = true;
  g.gain.value = gain * vel * LEVEL;
  const end = t + (e.step ?? 60 / 80 / 4) * steps;
  g.gain.setTargetAtTime(0, end - 0.03, 0.01);
  src.connect(g).connect(e.out);
  src.start(t, Math.random() * b.duration);
  src.stop(end + 0.05);
}
// The hip hop piano chord's muffling.
function muffle(e: KitEngine): AudioNode {
  return once(e.ctx, "hip-muffle", () => {
    const lp = e.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    lp.connect(e.out);
    return lp;
  });
}
// The hip hop organ (Wool's "eerie" line; nothing written says what made
// it): drawbars (16', 8', 4' and a little 2 2/3'), a slow warble, the top
// dark.
function organ(e: KitEngine, t: number, f: number) {
  const out = once(e.ctx, "hip-organ", () => {
    const lp = e.ctx.createBiquadFilter();
    const g = e.ctx.createGain();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    g.gain.value = 0.5;
    lp.connect(g).connect(e.out);
    return lp;
  });
  const env = e.ctx.createGain();
  const peak = 0.24 * vel;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.02);
  env.gain.setValueAtTime(peak, t + 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  env.connect(out);
  const wob = e.ctx.createOscillator();
  const wd = e.ctx.createGain();
  wob.frequency.value = 5.2;
  wd.gain.value = 6;
  wob.connect(wd);
  for (const [m, lvl] of [
    [0.5, 0.7],
    [1, 1],
    [2, 0.5],
    [3, 0.2],
  ]) {
    const o = e.ctx.createOscillator();
    const g = e.ctx.createGain();
    o.frequency.value = f * m;
    g.gain.value = lvl;
    wd.connect(o.detune);
    e.bend?.connect(o.detune);
    o.connect(g).connect(env);
    o.start(t);
    o.stop(t + 0.85);
  }
  wob.start(t);
  wob.stop(t + 0.85);
}
// ---- Florida street trap (BLP Kosher's The Nac) ---------------------------
// Its beat is Thrax x Rami's "Opposition", a Jacksonville type beat at 164
// (felt at 82), in G# minor by two readings. Nothing writes down what's in
// it, so the kit follows that lane's tutorials: a low piano bouncing on the
// root, a bell with a quarter-note echo ("there is always the bell"), a dark
// choir pad, a gritty snare, bright hats with rolls, a dry click either
// side, and a long distorted 808.
const nacRoom = (e: KitEngine) => roomSend(e, "nac-room", 1.4, 0.2);
function nacGrit(e: KitEngine): AudioNode {
  return once(e.ctx, "nac-grit", () => {
    const d = drive(e.ctx, 2.5);
    const g = e.ctx.createGain();
    g.gain.value = 0.8;
    d.connect(g).connect(e.out);
    return d;
  });
}
// The bell's echoes: darker each time.
function nacEcho(e: KitEngine): AudioNode {
  return once(e.ctx, "nac-echo", () => {
    const lp = e.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    lp.connect(e.out);
    return lp;
  });
}
let clickSide = 1;
function nac(e: KitEngine, v: KitVoice, t: number, note: number) {
  switch (v) {
    case "clap": {
      // The click: a dry tick, left then right.
      clickSide = -clickSide;
      const buf = smp(e, "nac-click", 0.05, (d, sr) => {
        for (let i = 0; i < d.length; i++) {
          const tt = i / sr;
          d[i] = (Math.sin(2 * Math.PI * 2800 * tt) * 0.8 + (Math.random() * 2 - 1) * 0.3) * Math.exp(-tt / 0.004);
        }
      });
      hit(e, buf, t, 0.7, { pan: 0.55 * clickSide });
      break;
    }
    case "bass": {
      // The 808: a long sine dropping onto its note, driven hard so it
      // growls (and carries on a phone).
      const buf = smp(e, `nac-808-${hz(note)}`, 1.6, (d, sr) => {
        let ph = 0;
        for (let i = 0; i < d.length; i++) {
          const tt = i / sr;
          ph += (2 * Math.PI * note * (1 + 0.6 * Math.exp(-tt / 0.025))) / sr;
          d[i] = (Math.tanh(3.5 * Math.sin(ph)) / Math.tanh(3.5)) * Math.exp(-tt / 0.8) * Math.min(1, tt / 0.002);
        }
      });
      hit(e, buf, t, 0.5, { bend: true });
      break;
    }
    case "synth": {
      // The bell: FM, its overtones (at 3.5 times) dying fast, then twice
      // more a beat apart, softer and darker.
      const buf = smp(e, `nac-bell-${hz(note)}`, 2, (d, sr) => {
        for (let i = 0; i < d.length; i++) {
          const tt = i / sr;
          const index = 2.6 * Math.exp(-tt / 0.12) + 0.35;
          d[i] = Math.sin(2 * Math.PI * note * tt + index * Math.sin(2 * Math.PI * note * 3.5 * tt)) * Math.exp(-tt / 0.7) * Math.min(1, tt / 0.001);
        }
      });
      hit(e, buf, t, 0.32, { bend: true, pan: -0.2 }).connect(nacRoom(e));
      const beat = (e.step ?? 60 / 82 / 4) * 4;
      hit(e, buf, t + beat, 0.12, { to: nacEcho(e), pan: 0.4 });
      hit(e, buf, t + beat * 2, 0.05, { to: nacEcho(e), pan: -0.4 });
      break;
    }
    case "animal": {
      // The choir: saws a few cents apart on the note and its fifth, through
      // an "ah"'s formants, rising slowly and held for a bar.
      const len = (e.step ?? 60 / 82 / 4) * 15;
      const g = e.ctx.createGain();
      const peak = 0.16 * vel;
      env(g.gain, t, [[0, 0.0001], [0.35, peak], [len, peak * 0.8], [len + 0.6, 0.0001]]);
      for (const [f, q, lvl] of [[700, 6, 1], [1220, 8, 0.5], [2600, 10, 0.25]]) {
        const bp = e.ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f;
        bp.Q.value = q;
        const lg = e.ctx.createGain();
        lg.gain.value = lvl;
        g.connect(bp).connect(lg).connect(e.out);
        lg.connect(nacRoom(e));
      }
      for (const [m, c] of [[1, -8], [1, 7], [1.4983, -5], [1.4983, 9]]) {
        const o = e.ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = note * m;
        o.detune.value = c;
        e.bend?.connect(o.detune);
        o.connect(g);
        o.start(t);
        o.stop(t + len + 0.7);
      }
      break;
    }
    case "bodhran":
      hit(e, smp(e, `piano-${hz(note)}`, 3, (d, sr) => S.piano(d, sr, { f: note, seed: 21 })), t, 0.6, { bend: true });
      break;
    default:
      playTrap(e, v, t, note);
  }
}

// A pad in any kit: its recording, or else its made sound. `note` is a
// tuned pad's (tuneHz); `velocity` a soft step's loudness.
export function playPad(e: KitEngine, kit: Kit, v: KitVoice, t: number, note: number, velocity = 1, step = 0) {
  vel = velocity;
  at = step;
  try {
    if (!warming && kit !== "triphop" && kit !== "hiphop" && playRec(e, kit, v, t, note)) return;
    if (kit === "trap") {
      if (v === "snare") hit(e, smp(e, "trap-openhat", 0.4, (d, sr) => S.cymbal808(d, sr, { decay: 0.26, hat: true })), t, 0.5);
      else playTrap(e, v, t, note);
    } else if (kit === "metal") {
      if (v === "bass") {
        if (!djScratch(e, t, 1.1)) scratch(e, t);
      } else metal(e, v, t, note);
    } else if (kit === "hiphop") {
      // (The drums and the loop off the worn record; the DJ, the siren and
      // the voice clean over them.)
      const worn = v === "clap" || v === "bass" || v === "animal" ? e : { ...e, out: lofi(e, "hiphop") as GainNode };
      if (v === "clap") {
        if (!djScratch(e, t, 0.7)) scratch(e, t);
      } else if (v === "synth") organ(worn, t, note);
      else if (warming || !playRec(worn, kit, v, t, note)) hiphop(worn, v, t);
    } else if (kit === "florida") nac(e, v, t, note);
    else {
      // (All of it through the worn tape.)
      const worn = { ...e, out: lofi(e, "triphop") as GainNode };
      if (warming || !playRec(worn, kit, v, t, note)) triphop(worn, v, t, note);
    }
  } finally {
    vel = 1;
    at = 0;
  }
}

// Made samples worked out ahead (when a kit or key is chosen), so the first
// hit of each isn't late: every sample-played pad and the tune's notes,
// gone through with nothing built or played.
export function warm(e: KitEngine, kit: Kit, key: MusicKey) {
  void loadKit(kit);
  // (Into a silent output, so the made sounds that play live go nowhere.)
  const ghost: KitEngine = { ...e, out: e.ctx.createGain(), bend: undefined };
  warming = true;
  try {
    for (const v of ["kick", "snare", "hat", "clap", "bass", "bodhran", "synth"] as KitVoice[])
      for (const [n, s] of new Map(Array.from({ length: 32 }, (_, s) => [tuneHz(kit, key, 31 - s, v), 31 - s] as const))) playPad(ghost, kit, v, 0, n, 1, s);
  } finally {
    warming = false;
  }
}
