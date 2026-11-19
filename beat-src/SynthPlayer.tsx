"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { CREDITS, hasTune, LABELS, loadKit, noteName, playPad, SWING, tuneHz, warm, type Kit } from "./kits";
import { ALL_KEYS, keyFromId, keyId, keyName, rootHz, type MusicKey } from "./musicKey";

// The drum machine, from the Lil Skag site (its LS—26, 2026-10; Joe asked
// for it here on 2026-10-19 without the palm tree printed on it, in this
// site's glass and orange). The rail's ↘ brings it up (Rail.tsx). Tap a
// sound to play it and pick it, then light up its 16 steps; the tempo and
// the key are set in the display. Every sound is synthesised with Web Audio, so there are no
// samples to load.

type Voice = "kick" | "snare" | "hat" | "clap" | "bass" | "bodhran" | "synth" | "animal";

const PADS: { voice: Voice; label: string; key: string }[] = [
  { voice: "kick", label: "kick", key: "1" },
  { voice: "snare", label: "snare", key: "2" },
  { voice: "hat", label: "hat", key: "3" },
  { voice: "clap", label: "clap", key: "4" },
  { voice: "bass", label: "808", key: "5" },
  { voice: "bodhran", label: "bodhrán", key: "6" },
  { voice: "synth", label: "synth", key: "7" }, // (it was a whistle: Joe, 2026-10-21)
  { voice: "animal", label: "animal", key: "8" }, // (it was a horn: Joe, 2026-10-21)
];

// The loop is 16 steps, or 32 (Joe, 2026-10-21: the option went, then
// "put the option back in to do 32 bars if needs be"). Every row holds 32;
// the presets' beats are 16 steps, twice over.
const STEPS = 32;
const MIN_BPM = 70;
const MAX_BPM = 180;

type Pattern = Record<Voice, boolean[]>;

// (A pattern of 16 steps plays twice over; one that reaches past 16 is all 32.)
// A pattern's steps: a one-bar pattern plays in both bars; one with a
// step past the first bar (or ONCE, a step that never comes) only where
// it says.
const ONCE = STEPS;
const row = (on: number[]) => Array.from({ length: STEPS }, (_, i) => (on.some((x) => x >= 16) ? on.includes(i) : on.includes(i % 16)));

// The presets (Joe, 2026-10-21: "a selection of presets for different
// sounds", then "Soundcloud Trap", "Death Metal", "Hip hop" and "Trip hop",
// and then "base all of these sound choices off of the references I'd
// given"). Each is a kit (kits.ts, which says what each pad is), a beat, a
// tempo and a key, built from what's written about its reference track
// (none of them could be heard from here). `soft`: steps played softer.
// - Soundcloud Trap, after 1400 / 999 Freestyle: 142 bpm (AcousticBrainz),
//   F# minor. No transcription exists, so the pattern is trap convention:
//   kick and 808 on 1, 8, 11; the clap on 3 (half-time); eighth hats
//   rolling into sixteenths; open hats; the woodwind on the bar's halves;
//   the keys' line (TUNES).
// - Death Metal, after Eyeless: its chorus from Songsterr's multitrack
//   transcription, at 105 bpm (the record's 210 in eighths, so 16 steps are
//   its two-bar riff): both kicks on the eighths, the snare's backbeat and
//   roll, a crash on every beat, the keg doubling the snare, the riff, the
//   opening "Yeah!".
// - Hip Hop, after Wool: 78 bpm and Db (AcousticBrainz), a lazy bounce.
//   Nothing transcribes it, so it's a proposal: kick 1, 8, 11; snare 2 and
//   4; eighth hats; a ghost rim; the bass with the kick; the chord; the
//   organ line; the hook's "uh".
// - Trip Hop, after It Could Be Sweet: about 77 bpm, B minor (its home
//   chord Bm7), swung: only the 808's kick, rim on 2 and 4 and cymbal
//   (quieter off the beat), the sub on the chords' roots, the Rhodes.
type Soft = Partial<Record<Voice, number[]>>;
type Preset = { name: string; kit: Kit; bpm: number; key: MusicKey; pattern: Pattern; soft?: Soft; len?: 16 | 32 };
// A step's loudness: a preset's soft steps a little over half.
// The steps' notes moved (Joe, 2026-10-21: "If you hold on the arpegiator
// buttons you can change the note"): semitones on a tuned pad's step, over
// its tune.
type Shift = Partial<Record<Voice, number[]>>;
const shiftHz = (hz: number, shift: Shift, v: Voice, s: number) => hz * 2 ** ((shift[v]?.[s] ?? 0) / 12);
const velAt = (soft: Soft | undefined, v: Voice, s: number) => (soft?.[v]?.includes(s % 16) ? 0.55 : 1);
const beat = (on: Partial<Record<Voice, number[]>>): Pattern => ({
  kick: row(on.kick ?? []),
  snare: row(on.snare ?? []),
  hat: row(on.hat ?? []),
  clap: row(on.clap ?? []),
  bass: row(on.bass ?? []),
  bodhran: row(on.bodhran ?? []),
  synth: row(on.synth ?? []),
  animal: row(on.animal ?? []),
});
const PRESETS: Preset[] = [
  {
    // After Lil Uzi Vert's XO Tour Llif3 (kits.ts): 155 played at half
    // time, B minor, a quarter-tone flat; four of its bars (Gmaj7, Gmaj7,
    // Em9, F#m7), from fans' transcriptions that agree. The soft hats are
    // rolls; the soft lead notes its quieter repeats.
    name: "Soundcloud Trap",
    kit: "trap",
    bpm: 78,
    key: { tonic: 11, minor: true },
    len: 32,
    pattern: beat({
      kick: [0, 6, 10, 13, 16, 22, 26, 29, 30],
      clap: [4, 12, 15],
      snare: [2, 10], // (the open hat)
      hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      bass: [0, 6, 10, 16, 22, 26],
      bodhran: [0, 4, 8, 12, 16, 20, 24, 28],
      synth: [0, 2, 4, 5, 6, 7, 8, 10, 11, 13, 14, 16, 18, 20, 21, 22, 23, 24, 26, 27, 29, 30],
      animal: [0, 8, 16, 24], // (the tape)
    }),
    soft: { hat: [4, 14], synth: [5, 6, 7, 11, 13, 14] },
  },
  {
    // After Slipknot's Duality (kits.ts; Songsterr's transcription): 146,
    // drop B, its main stop riff, Joey Jordison's kicks, flammed snare and
    // crashes on the stabs, the soft snare triplet and the China hits (the
    // keg) in the second bar, and the pinch-harmonic squeal to end it. The
    // soft guitar steps are palm-muted.
    name: "Metal", // (Joe, 2026-10-21: it was "Death Metal")
    kit: "metal",
    bpm: 146,
    key: { tonic: 11, minor: true },
    len: 32,
    pattern: beat({
      kick: [0, 2, 5, 8, 12, 14, 18, 24, 28],
      snare: [0, 1, 4, 12, 20, 22, 23, 28],
      hat: [2, 5, 8, 12, 16, 20], // (the crash)
      clap: [24, 28], // (the keg, for the China)
      synth: [2, 5, 8, 14, 18, 20, 22, 24],
      bodhran: [28], // (the squeal)
      // (Every pad in the demo, Joe, 2026-10-22: the DJ's cut in the riff's
      // dead stop, and the lead's D5 over the held D5.)
      bass: [10, ONCE], // (the scratch)
      animal: [25], // (the lead)
    }),
    soft: { snare: [1, 6, 7], synth: [4, 6] },
  },
  {
    // After Westside Gunn's Griselda beats (kits.ts): 78, C# minor, a
    // quarter-tone flat like a pitched-down record; ad-libs to end the
    // lines, the DJ cutting at the end of the second bar.
    name: "Hip Hop",
    kit: "hiphop",
    bpm: 78,
    key: { tonic: 1, minor: true },
    len: 32,
    pattern: beat({
      kick: [0, 7, 10],
      snare: [4, 12],
      hat: [2, 6, 10, 14],
      clap: [28],
      bass: [0, ONCE], // (the siren)
      bodhran: [0, 8, 16, 24],
      synth: [0, 4, 8, 12],
      animal: [9, 25],
    }),
    soft: { kick: [7], hat: [2, 6, 10, 14] },
  },
  {
    // After Portishead's Wandering Star (kits.ts): 80, B minor, swung in
    // triplets, Barrow's scratches at the end of the second bar, the
    // theremin coming in with it.
    name: "Trip Hop",
    kit: "triphop",
    bpm: 80,
    key: { tonic: 11, minor: true },
    len: 32,
    pattern: beat({
      kick: [0, 1, 7, 8, 9, 15],
      snare: [4, 12],
      hat: [0, 2, 4, 6, 8, 10, 12, 14],
      clap: [28],
      bass: [0, 4, 8, 12],
      bodhran: [0, 16],
      synth: [0, 8, 16, 24],
      animal: [16], // (the theremin, once in the two bars)
    }),
    soft: { hat: [2, 6, 10, 14], kick: [1, 9] },
  },
  {
    // After BLP Kosher's The Nac (kits.ts): 164 felt at 82, in G# minor.
    name: "Florida Trap",
    kit: "florida",
    bpm: 82,
    key: { tonic: 8, minor: true },
    pattern: beat({
      kick: [0, 7, 10],
      bass: [0, 7, 10, 13],
      snare: [4, 12],
      hat: [0, 2, 6, 8, 10, 14, 15],
      clap: [3, 6, 13],
      bodhran: [0, 3, 6, 8, 10, 13],
      synth: [0, 2, 4, 6, 8, 10, 12, 14],
      animal: [0],
    }),
    soft: { hat: [14, 15] }, // (rolls)
  },
];
const STARTER = PRESETS[0].pattern;
const STARTER_BPM = PRESETS[0].bpm;
const STARTER_KEY = PRESETS[0].key;

// `root` is the 808's note, the key's tonic (musicKey.ts).
// `bend` is the pitch wheel (live only): a steady signal, in cents, added
// to the synth's notes.
// `kit` is the preset's (kits.ts).
// (`master`: what's heard, after the compressor: the session recorder's.)
type Engine = { ctx: BaseAudioContext; out: GainNode; noise: AudioBuffer; root?: number; bend?: ConstantSourceNode; kit?: Kit; step?: number; master?: AudioNode }; // (an offline context too, for the export)

function noiseBuffer(ctx: BaseAudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// A pad, in the engine's kit (kits.ts). `note` is a tuned pad's, from its
// tune in the key; `vel` a soft step's loudness.
function play(eng: Engine, voice: Voice, t: number, note = 440, vel = 1, step = 0) {
  playPad(eng, eng.kit ?? "trap", voice, t, note, vel, step);
}

// The export (Joe, 2026-10-21: "the export can be an audio file"): the
// loop four times over, rendered offline (no waiting for it to play) into
// a 44.1kHz stereo WAV.
async function renderLoop({
  pattern,
  shift,
  soft,
  key,
  kit,
  len,
  bpm,
}: {
  pattern: Pattern;
  shift: Shift;
  soft?: Soft;
  key: MusicKey;
  kit: Kit;
  len: number;
  bpm: number;
}): Promise<File> {
  await loadKit(kit); // (the kit's recordings, so they're in the file)
  const rate = 44100;
  const stepLen = 60 / bpm / 4;
  const total = len * 4; // (four times round)
  const seconds = total * stepLen + 0.8;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const comp = ctx.createDynamicsCompressor();
  const out = ctx.createGain();
  out.gain.value = 0.7;
  out.connect(comp).connect(ctx.destination);
  const eng: Engine = { ctx, out, noise: noiseBuffer(ctx), root: rootHz(key), kit, step: stepLen };
  for (let i = 0; i < total; i++) {
    const s = i % len;
    const t = 0.02 + i * stepLen;
    const at = t + (s % 2 ? SWING[kit] * stepLen : 0); // (swung)
    PADS.forEach((p) => pattern[p.voice][s] && play(eng, p.voice, at, shiftHz(tuneHz(kit, key, s, p.voice), shift, p.voice, s), velAt(soft, p.voice, s), s));
  }
  const buf = await ctx.startRendering();
  return new File([wav(buf)], "sumo-joe-loop.wav", { type: "audio/wav" });
}

// An AudioBuffer as a 16-bit PCM WAV file.
function wav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (at: number, text: string) => [...text].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF");
  data.setUint32(4, 36 + n * ch * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  str(36, "data");
  data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  // Brought down to just under full level if it peaks over it, so the file
  // never clips.
  let peak = 0;
  for (const d of chans) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const k = peak > 0.98 ? 0.98 / peak : 1;
  let at = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i] * k));
      data.setInt16(at, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      at += 2;
    }
  return new Blob([data], { type: "audio/wav" });
}

// Saving the sound: the share sheet on a phone (where "Save to Files" keeps
// it), a download elsewhere.
function canShareFile(file: File) {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  return touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}
function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
const INSTAGRAM_DM = "https://ig.me/m/sumojoestudio"; // the chat with Sumo Joe

// The beat's level.
const OUT_LEVEL = 0.8;
// The session recorder (Joe, 2026-10-21: "the record button should record
// the session so it'll pick up the pitch bending and even if you switch
// between presets. it just records the entire session until told to stop
// which then becomes the audio file to export. Let's not bother with
// vocals"; the button was the microphone's, for vocal takes): a worklet
// copies what's heard (after the compressor), both sides, until record is
// pressed again (or MAX_SESSION), and that's the WAV the export gives.
const REC_TAP = `class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; this.l = new Float32Array(8192); this.r = new Float32Array(8192); }
  process(inputs) {
    const i = inputs[0];
    if (i && i[0]) {
      const l = i[0], r = i[1] || i[0];
      this.l.set(l, this.n); this.r.set(r, this.n); this.n += l.length;
      if (this.n + 128 > this.l.length) { this.port.postMessage([this.l.slice(0, this.n), this.r.slice(0, this.n)]); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("sj-rec", Rec);`;
const MAX_SESSION = 10 * 60; // (seconds: ten minutes, about 230MB as it's held)
type Session = { node: AudioWorkletNode; sink: GainNode; l: Float32Array[]; r: Float32Array[]; frames: number; sr: number; start: number };
// The session as a WAV, its silent start (before the first sound) cut.
function sessionFile(s: Session): File {
  const join = (parts: Float32Array[]) => {
    const d = new Float32Array(s.frames);
    let at = 0;
    for (const p of parts) {
      d.set(p.subarray(0, Math.min(p.length, s.frames - at)), at);
      at += p.length;
    }
    return d;
  };
  const l = join(s.l);
  const r = join(s.r);
  let first = 0;
  while (first < l.length && Math.abs(l[first]) < 1e-4 && Math.abs(r[first]) < 1e-4) first++;
  first = Math.max(0, first - Math.round(s.sr * 0.01));
  const n = Math.max(1, l.length - first);
  const buf = new AudioBuffer({ length: n, sampleRate: s.sr, numberOfChannels: 2 });
  buf.copyToChannel(l.subarray(first), 0);
  buf.copyToChannel(r.subarray(first), 1);
  return new File([wav(buf)], "sumo-joe-session.wav", { type: "audio/wav" });
}
const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;

// The pitch wheel (Joe, 2026-10-21: "keep in the pitch bender for the
// synth"; it bent the keys before they went): a ridged wheel in a well,
// dragged up or down to bend the synth's notes as they sound (-1 to 1, two
// semitones either way), springing back to the middle when let go (the CSS
// transition on .sp-wheel-roll, off while it's held). The arrow keys up and
// down bend too.
const BEND = 200;
function PitchWheel({ value, onChange, className = "" }: { value: number; onChange: (v: number) => void; className?: string }) {
  const drag = useRef<{ y: number; h: number } | null>(null);
  const [held, setHeld] = useState(false);
  const end = () => {
    drag.current = null;
    setHeld(false);
    onChange(0);
  };
  return (
    <div
      className={`sp-wheel ${className} ${held ? "is-held" : ""}`}
      role="slider"
      tabIndex={0}
      aria-label="Pitch bend"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Math.round(value * 100) / 100}
      style={{ "--bend": value } as CSSProperties}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        drag.current = { y: e.clientY, h: e.currentTarget.getBoundingClientRect().height };
        setHeld(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        // (Full bend a little way up or down: at least 36px, so the short
        // wheel on a phone isn't twitchy.)
        onChange(Math.max(-1, Math.min(1, (d.y - e.clientY) / Math.max(36, d.h * 0.4))));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) onChange(e.key === "ArrowUp" ? 1 : -1);
      }}
      onKeyUp={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.stopPropagation();
          onChange(0);
        }
      }}
    >
      <span className="sp-wheel-roll" aria-hidden />
    </div>
  );
}

// The tempo, in the display (Joe, 2026-10-21: the dial moved "into the main
// display"): the number with an arrow either side, a beat a minute a press
// (held, it keeps going); or drag the number up or down (or sideways); or,
// focused, the arrow keys (with shift, ten at a time).
function Tempo({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const drag = useRef<{ x: number; y: number; v: number } | null>(null);
  const hold = useRef<number[]>([]);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const clamp = (v: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, v));
  const stop = () => {
    hold.current.forEach((id) => window.clearTimeout(id));
    hold.current = [];
  };
  const nudge = (by: number) => {
    onChange(clamp(valueRef.current + by));
    stop();
    const go = () => {
      valueRef.current = clamp(valueRef.current + by);
      onChange(valueRef.current);
      hold.current.push(window.setTimeout(go, 60));
    };
    hold.current.push(window.setTimeout(go, 380));
  };
  useEffect(() => stop, []);
  const arrow = (by: number, label: string, d: string) => (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      disabled={by < 0 ? value <= MIN_BPM : value >= MAX_BPM}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        nudge(by);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      <svg viewBox="0 0 8 12" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
  return (
    <span
      className="sp-tempo"
      role="slider"
      tabIndex={0}
      aria-label="Tempo"
      aria-valuemin={MIN_BPM}
      aria-valuemax={MAX_BPM}
      aria-valuenow={value}
      aria-valuetext={`${value} beats per minute`}
      onKeyDown={(e) => {
        const by = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + by));
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - by));
        else return;
        e.preventDefault();
      }}
    >
      {arrow(-1, "Slower", "M6 1.5 1.5 6 6 10.5")}
      <span
        className="sp-tempo-n"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) onChange(clamp(d.v + Math.round((d.y - e.clientY + e.clientX - d.x) / 3)));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {value}
        <span className="sp-tempo-unit"> bpm</span>
      </span>
      {arrow(1, "Faster", "M2 1.5 6.5 6 2 10.5")}
    </span>
  );
}

export default function SynthPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // The export popup (Joe, 2026-10-21): the export icon opens it; in it,
  // the formats to save and "Share with Joe". (Put away with the machine.)
  const [menuOn, setMenu] = useState(false);
  const menu = menuOn && open;
  const menuRef = useRef(false);
  const engine = useRef<(Engine & { ctx: AudioContext }) | null>(null); // (the live one: a real AudioContext)
  const synthNote = useRef(0); // (the synth pad, pressed, walks through its tune)
  const [pattern, setPattern] = useState(STARTER);
  const [shift, setShift] = useState<Shift>({});
  const shiftRef = useRef<Shift>({});
  useEffect(() => {
    shiftRef.current = shift;
  }, [shift]);
  const [sel, setSel] = useState<Voice>("kick");
  // (The pads, to flash one as it's hit straight on the page: Joe,
  // 2026-10-21, "make them really responsive to tap so you can play live";
  // a redraw of the whole machine for each hit slowed fast tapping.)
  const padEls = useRef<Partial<Record<Voice, HTMLButtonElement | null>>>({});
  const [lit, setLit] = useState<Voice[]>([]);
  const [playing, setPlaying] = useState(false);
  // The session being recorded (lib above), and the last one made.
  const session = useRef<Session | null>(null);
  const recReady = useRef(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [recFile, setRecFile] = useState<File | null>(null);
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(STARTER_BPM);
  const [len, setLen] = useState<16 | 32>(PRESETS[0].len ?? 16);
  const lenRef = useRef(len);
  useEffect(() => {
    lenRef.current = len;
  }, [len]);
  const patternRef = useRef(pattern);
  // The key (musicKey.ts; Joe, 2026-10-21: chosen in the display): the
  // vocals are tuned into it, and the 808 and the synth play in it.
  const [key, setKey] = useState<MusicKey>(STARTER_KEY);
  const [preset, setPreset] = useState(0);
  const kit = PRESETS[preset].kit;
  const softRef = useRef<Soft | undefined>(PRESETS[0].soft);
  useEffect(() => {
    softRef.current = PRESETS[preset].soft;
  }, [preset]);
  const kitRef = useRef<Kit>(kit);
  useEffect(() => {
    kitRef.current = kit;
    if (engine.current) engine.current.kit = kit;
  }, [kit]);
  // (The kit's made samples worked out ahead, whenever it or the key
  // changes, so the first hits aren't late.)
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const id = window.setTimeout(() => warm(e, kit, key), 0);
    return () => window.clearTimeout(id);
  }, [kit, key]);
  // The pitch wheel, -1 to 1: dragged, or the arrow keys held; it springs
  // back to 0 when let go. Every sounding synth note bends with it.
  const [bend, setBend] = useState(0);
  useEffect(() => {
    const e = engine.current;
    if (e?.bend) e.bend.offset.setTargetAtTime(bend * BEND, e.ctx.currentTime, 0.015);
  }, [bend]);
  // (A sixteenth's length, for the sounds timed to the tempo, such as the
  // bell's echoes, the hat's rolls and the scratches.)
  const stepRef = useRef(60 / STARTER_BPM / 4);
  useEffect(() => {
    stepRef.current = 60 / bpm / 4;
    if (engine.current) engine.current.step = stepRef.current;
  }, [bpm]);
  const keyRef = useRef<MusicKey>(STARTER_KEY);
  useEffect(() => {
    keyRef.current = key;
    if (engine.current) engine.current.root = rootHz(key);
  }, [key]);
  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  const audio = useCallback(() => {
    if (!engine.current) {
      // On an iPhone, web audio is silent while the ringer is switched to
      // silent, unless the page says it's playing media (Safari's Audio
      // Session API), as a video would (Joe heard nothing on his phone).
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
      const ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor();
      const out = ctx.createGain();
      out.gain.value = OUT_LEVEL;
      out.connect(comp).connect(ctx.destination);
      const bend = ctx.createConstantSource();
      bend.offset.value = 0;
      bend.start();
      engine.current = { ctx, out, noise: noiseBuffer(ctx), root: rootHz(keyRef.current), bend, kit: kitRef.current, step: stepRef.current, master: comp };
      const e = engine.current;
      window.setTimeout(() => warm(e, kitRef.current, keyRef.current), 0);
    }
    const { ctx } = engine.current;
    if (ctx.state !== "running") {
      ctx.resume();
      // (iOS opens the audio on a sound started inside a tap: a moment of
      // silence does it.)
      const blip = ctx.createBufferSource();
      blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      blip.connect(ctx.destination);
      blip.start();
    }
    return engine.current;
  }, []);

  // A tap anywhere on the machine (a touchend, which iOS counts as the
  // visitor starting playback, where a press may not) opens the audio.
  useEffect(() => {
    if (!open) return;
    const unlock = () => audio();
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("click", unlock);
    return () => {
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
    };
  }, [open, audio]);

  const trigger = useCallback(
    (voice: Voice) => {
      const e = audio();
      const s = synthNote.current++;
      play(e, voice, e.ctx.currentTime, shiftHz(tuneHz(kitRef.current, keyRef.current, s, voice), shiftRef.current, voice, s % 32), 1, s);
      const el = padEls.current[voice];
      if (el) {
        el.classList.remove("is-hit");
        void el.offsetWidth; // (to flash again on a quick second hit)
        el.classList.add("is-hit");
        window.setTimeout(() => el.classList.remove("is-hit"), 110);
      }
      setSel((v) => (v === voice ? v : voice));
    },
    [audio],
  );


  // While it's up: the number keys 1 to 8 hit the pads, space starts and
  // stops, Escape puts it away.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && e.repeat) return e.preventDefault();
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "Escape") {
        // (The export popup first, if it's up.)
        if (menuRef.current) setMenu(false);
        else onClose();
        return;
      }
      if (e.key === " " && (target === document.body || target.closest(".sp"))) {
        if (target.closest("button")) return;
        e.preventDefault();
        audio();
        setPlaying((p) => !p);
        return;
      }
      // The arrow keys up and down, held, push the pitch wheel up or down
      // (not while the tempo or a slider has them).
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !target.closest('[role="slider"]')) {
        e.preventDefault();
        audio();
        setBend(e.key === "ArrowUp" ? 1 : -1);
        return;
      }
      const pad = PADS.find((p) => p.key === e.key.toLowerCase());
      if (pad) trigger(pad.voice);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") setBend(0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [open, trigger, audio, onClose]);

  // The sequencer clock: schedules a little ahead so timing stays tight.
  useEffect(() => {
    if (!playing) return;
    const e = audio();
    const stepLen = 60 / bpm / 4;
    e.step = stepLen;
    let next = e.ctx.currentTime + 0.05;
    let i = 0;
    const pending = new Set<number>();
    const timer = window.setInterval(() => {
      while (next < e.ctx.currentTime + 0.1) {
        const s = i % lenRef.current;
        const on = PADS.map((p) => p.voice).filter((v) => patternRef.current[v][s]);
        // (The off-beat sixteenths a little late in a kit that swings.)
        const at = next + (s % 2 ? SWING[kitRef.current] * stepLen : 0);
        on.forEach((v) => play(e, v, at, shiftHz(tuneHz(kitRef.current, keyRef.current, s, v), shiftRef.current, v, s), velAt(softRef.current, v, s), s));
        const id = window.setTimeout(() => {
          pending.delete(id);
          setStep(s);
          setLit(on);
        }, Math.max(0, (next - e.ctx.currentTime) * 1000));
        pending.add(id);
        next += stepLen;
        i++;
      }
    }, 25);
    return () => {
      window.clearInterval(timer);
      pending.forEach((id) => window.clearTimeout(id));
      window.setTimeout(() => {
        setStep(-1);
        setLit([]);
      }, 0);
    };
  }, [playing, bpm, audio, kit]);

  // Record: the session from now (the beat started if it's stopped) until
  // it's pressed again; then it's the export, and the export opens.
  const stopRec = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    s.node.port.onmessage = null;
    s.node.disconnect();
    s.sink.disconnect();
    setRecording(false);
    if (s.frames > 0) {
      setRecFile(sessionFile(s));
      setMenu(true);
    }
  }, []);
  const recPress = async () => {
    if (session.current) return stopRec();
    const e = audio();
    if (!e.master) return;
    if (!recReady.current) {
      const url = URL.createObjectURL(new Blob([REC_TAP], { type: "application/javascript" }));
      await e.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      recReady.current = true;
    }
    const ctx = e.ctx as AudioContext;
    const node = new AudioWorkletNode(ctx, "sj-rec", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: "explicit" });
    // (Pulled through to the speakers, silently, so it runs.)
    const sink = ctx.createGain();
    sink.gain.value = 0;
    e.master.connect(node).connect(sink).connect(ctx.destination);
    const s: Session = { node, sink, l: [], r: [], frames: 0, sr: ctx.sampleRate, start: ctx.currentTime };
    node.port.onmessage = (m: MessageEvent<[Float32Array, Float32Array]>) => {
      s.l.push(m.data[0]);
      s.r.push(m.data[1]);
      s.frames += m.data[0].length;
      if (s.frames / s.sr >= MAX_SESSION) stopRec();
    };
    session.current = s;
    setRecTime(0);
    setRecording(true);
    setPlaying(true);
  };
  // (Its time, while it records.)
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const s = session.current;
      if (s) setRecTime(s.frames / s.sr);
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);
  // Closed, it stops (and a session being recorded ends).
  useEffect(() => {
    if (!open)
      window.setTimeout(() => {
        setPlaying(false);
        stopRec();
      }, 0);
  }, [open, stopRec]);
  // The sound file, kept until the loop changes (so a second press, to save
  // it once it's ready, doesn't make it again).
  const [sound, setSound] = useState<{ file: File; key: string } | null>(null);
  const [ready, setReady] = useState(false); // made, waiting for a tap to save it
  useEffect(() => {
    menuRef.current = menu;
    if (!menu) return;
    // A press anywhere else puts it away.
    const away = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(".sp-export, .sp-export-btn")) setMenu(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);
  const loopKey = JSON.stringify({ pattern, shift, key, kit, len, bpm });
  // (A session recorded is the export; otherwise the loop, four times.)
  const freshSound = recFile ?? (sound && sound.key === loopKey ? sound.file : null);
  // Made as the popup comes up, so it's there to download the moment Share
  // with Joe is pressed (before Instagram opens).
  useEffect(() => {
    if (!menu || freshSound) return;
    let gone = false;
    renderLoop({ pattern, shift, soft: PRESETS[preset].soft, key, kit, len, bpm }).then((file) => {
      if (!gone) setSound({ file, key: loopKey });
    });
    return () => {
      gone = true;
    };
  }, [menu, freshSound, pattern, shift, preset, key, kit, len, bpm, loopKey]);

  const save = async (file: File) => {
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file] });
      } catch (err) {
        if ((err as Error).name === "NotAllowedError") return setReady(true);
      }
    } else download(file);
    setReady(false);
    setMenu(false);
  };
  // Export: the loop four times over as a WAV, made in a moment.
  const exportSound = async () => {
    if (freshSound) return save(freshSound);
    const file = await renderLoop({ pattern, shift, soft: PRESETS[preset].soft, key, kit, len, bpm });
    setSound({ file, key: loopKey });
    await save(file);
  };
  // Share with Joe (Joe, 2026-10-21): the sound file downloads, and the
  // chat with @sumojoestudio opens in Instagram (the button is a link to
  // it), to send it in.
  const shareSound = () => {
    if (freshSound) download(freshSound);
    else
      renderLoop({ pattern, shift, soft: PRESETS[preset].soft, key, kit, len, bpm }).then((file) => {
        setSound({ file, key: loopKey });
        download(file);
      });
  };

  // Clear: the chosen sound's steps emptied. Reset: everything as it
  // starts (the beat, the key, the tempo, no vocal take), and any recording
  // stopped.
  const bendTo = (v: number) => {
    audio();
    setBend(v);
  };
  // Each preset as it was left (Joe, 2026-10-22: "When going through the
  // presets remember what had been set when previously edited. Only revert
  // back when the page has been refreshed"): its steps, moved notes, tempo,
  // key and length, kept here (not stored: a refresh starts them afresh).
  type Edits = { pattern: Pattern; shift: Shift; bpm: number; key: MusicKey; len: 16 | 32 };
  const edits = useRef<Record<number, Edits>>({});
  const choosePreset = (i: number) => {
    edits.current[preset] = { pattern, shift, bpm, key, len };
    const p = PRESETS[i];
    const was = edits.current[i];
    setPreset(i);
    setLen(was?.len ?? p.len ?? 16);
    setPattern(was?.pattern ?? p.pattern);
    setShift(was?.shift ?? {});
    setBpm(was?.bpm ?? p.bpm);
    setKey(was?.key ?? p.key);
  };
  const clearSel = () => {
    setPattern((p) => ({ ...p, [sel]: row([]) }));
    setShift((sh) => ({ ...sh, [sel]: undefined }));
  };
  // Reset: the chosen sound's steps and notes back as the preset has them
  // (Joe, 2026-10-21: "The reset button resets the instrument chosen, not
  // the entire track"; it used to put the whole machine back).
  const reset = () => {
    setPattern((p) => ({ ...p, [sel]: PRESETS[preset].pattern[sel] }));
    setShift((sh) => ({ ...sh, [sel]: undefined }));
  };

  const toggle = (s: number) => setPattern((p) => ({ ...p, [sel]: p[sel].map((v, j) => (j === s ? !v : v)) }));
  // A step held (a tuned pad's): dragged up or down, its note moves a
  // semitone every 14px, heard as it goes; let go, it keeps the note (and
  // is on). A press still just turns it on or off.
  const holding = useRef<{ s: number; y: number; base: number; n: number; timer: number; on: boolean; id: number } | null>(null);
  const heldClick = useRef(false);
  const [held, setHeld] = useState<{ s: number; hz: number } | null>(null);
  const stepHz = (s: number, n: number) => tuneHz(kit, key, s, sel) * 2 ** (n / 12);
  const hear = (s: number, n: number) => {
    const e = audio();
    const hz = stepHz(s, n);
    play(e, sel, e.ctx.currentTime, hz, 1, s);
    setHeld({ s, hz });
  };
  const holdStart = (s: number, ev: React.PointerEvent<HTMLButtonElement>) => {
    if (!hasTune(kit, sel)) return;
    const el = ev.currentTarget;
    const base = shift[sel]?.[s] ?? 0;
    const h = { s, y: ev.clientY, base, n: base, timer: 0, on: false, id: ev.pointerId };
    h.timer = window.setTimeout(() => {
      h.on = true;
      try {
        el.setPointerCapture(h.id);
      } catch {
        // (The press ended already.)
      }
      hear(s, base);
    }, 350);
    holding.current = h;
  };
  const holdMove = (ev: React.PointerEvent<HTMLButtonElement>) => {
    const h = holding.current;
    if (!h) return;
    if (!h.on) {
      if (Math.abs(ev.clientY - h.y) > 8) {
        window.clearTimeout(h.timer);
        holding.current = null;
      }
      return;
    }
    const n = Math.max(-24, Math.min(24, h.base + Math.round((h.y - ev.clientY) / 14)));
    if (n !== h.n) {
      h.n = n;
      hear(h.s, n);
    }
  };
  const holdEnd = () => {
    const h = holding.current;
    holding.current = null;
    if (!h) return;
    window.clearTimeout(h.timer);
    if (!h.on) return;
    heldClick.current = true;
    setHeld(null);
    setShift((sh) => {
      const row32 = [...(sh[sel] ?? Array(32).fill(0))];
      row32[h.s] = h.n;
      return { ...sh, [sel]: row32 };
    });
    setPattern((p) => ({ ...p, [sel]: p[sel].map((v, j) => (j === h.s ? true : v)) }));
  };

  const selTuned = hasTune(kit, sel);
  const labels = LABELS[kit];
  const selIndex = PADS.findIndex((p) => p.voice === sel);
  const selLabel = labels[selIndex];

  return (
    <div
      id="synth"
      className={`sp ${open ? "is-open" : ""}`}
      role="dialog"
      aria-label="Drum machine"
      aria-hidden={!open}
      inert={!open}
      data-lenis-prevent
    >
      <div className="sp-top">
        {/* The sound preset in the title's place, and the vocal style beside
            it (Joe, 2026-10-21: "Move the sound preset in the position of
            'Drum Machine' and remove Drum machine title. Place the
            'Autotune' drop down next to it"). Each a name with the menu laid
            over it unseen. */}
        <div className="sp-top-picks">
          <span className="sp-keysel-wrap sp-preset-wrap">
            <span className="sp-preset-name" aria-hidden>
              {PRESETS[preset].name}
            </span>
            <select className="sp-preset" aria-label="Sound preset" value={preset} onChange={(e) => choosePreset(Number(e.target.value))}>
              {PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </span>
        </div>
        {/* Export, a round glass icon in the corner where the × was (Joe,
            2026-10-21; the rail's cross and Escape put the machine away). It
            opens the export popup. */}
        <div className="sp-top-buttons">
          <button
            type="button"
            className={`sp-out-btn sp-export-btn ${menu ? "is-on" : ""}`}
            aria-label="Export the loop"
            aria-haspopup="dialog"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
            </svg>
          </button>
        </div>
        {/* The popup: the loop four times over as a sound file, to keep or
            to send to Sumo Joe on Instagram. */}
        <div className={`sp-export ${menu ? "is-open" : ""}`} role="dialog" aria-label="Export the loop" inert={!menu}>
          <button type="button" className={`sp-export-fmt ${ready ? "is-ready" : ""}`} onClick={exportSound}>
            <span>{recFile ? "Session" : "Loop"}</span>
            <span className="sp-export-ext">WAV</span>
          </button>
          <a className="sp-export-share" href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer" onClick={shareSound}>
            Share with Joe
          </a>
        </div>
      </div>

      <div className="sp-controls">
        <div className="sp-display">
          <div className="sp-display-row sp-display-top">
            <Tempo value={bpm} onChange={setBpm} />
            {/* The key (Joe, 2026-10-21: "choose the key it's in in the main
                display"): the phone's own picker, or a list. */}
            <span className="sp-keysel-wrap">
              <select className="sp-keysel" aria-label="Key" value={keyId(key)} onChange={(e) => setKey(keyFromId(e.target.value))}>
                {ALL_KEYS.map((k) => (
                  <option key={keyId(k)} value={keyId(k)}>
                    {keyName(k)}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <div className="sp-leds" aria-hidden>
            {Array.from({ length: len }, (_, s) => (
              <span
                key={s}
                className={s === step ? "is-now" : pattern[sel][s] ? "is-on" : ""}
              />
            ))}
          </div>
          {/* The display's foot: the key's name, the vocal effect, and the
              step. */}
          <div className="sp-display-row sp-small sp-display-foot">
            {/* The loop's length, 16 steps or 32 (Joe, 2026-10-21: "put the
                option back in to do 32 bars if needs be"). */}
            <span className="sp-foot-left">
              <button
                type="button"
                className={`sp-len-pill ${len === 32 ? "is-on" : ""}`}
                aria-label={`Loop length ${len} steps: switch to ${len === 16 ? 32 : 16}`}
                onClick={() => setLen((l) => (l === 16 ? 32 : 16))}
              >
                {len}
              </button>
            </span>
            <span>
              {recording ? <span className="sp-rec-time">rec {clock(recTime)} · </span> : null}
              step {step < 0 ? "--" : String(step + 1).padStart(2, "0")}
            </span>
          </div>
          {/* The credit the kit's recordings need, small (Joe, 2026-10-21);
              every source and licence in CREDITS.md. */}
          <a className="sp-credit" href="/samples/CREDITS.md" target="_blank" rel="noopener">
            {CREDITS[kit]}
          </a>
        </div>
        {/* The pitch wheel, for the synth: here, between the display and
            play, on a phone; beside the steps on a desktop (Joe,
            2026-10-21). One or the other is shown. */}
        <PitchWheel className="sp-wheel-phone" value={bend} onChange={bendTo} />
        {/* Play, an icon alone (Joe, 2026-10-21): a triangle, a square while
            it plays; and record (the microphone) under it (Joe: "move the
            record button below the play button"). */}
        <div className="sp-transport">
          <button
            type="button"
            className="sp-play"
            aria-label={playing ? "Stop" : "Play"}
            aria-pressed={playing}
            onClick={() => {
              audio();
              setPlaying((p) => !p);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              {playing ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2Z" />}
            </svg>
          </button>
          {/* Record: the session, everything heard, until it's pressed again
              (then it's the export). A ring with a dot; a square while it
              records, orange. */}
          <button
            type="button"
            className={`sp-mic sp-rec-btn ${recording ? "is-rec" : ""}`}
            aria-label={recording ? "Stop recording the session" : "Record the session"}
            aria-pressed={recording}
            onClick={recPress}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              {recording ? <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor" /> : <circle cx="12" cy="12" r="5" fill="currentColor" />}
              {!recording && <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />}
            </svg>
          </button>
        </div>
      </div>

      <div className="sp-grid">
        <div className="sp-sec sp-sec-sounds">
          <div className="sp-pads">
            {PADS.map((p, pi) => {
              const down = lit.includes(p.voice);
              const used = pattern[p.voice].some(Boolean);
              return (
                <button
                  key={p.voice}
                  ref={(el) => {
                    padEls.current[p.voice] = el;
                  }}
                  type="button"
                  className={`sp-pad ${down ? "is-down" : ""}`}
                  aria-label={`${labels[pi]} (key ${p.key.toUpperCase()})`}
                  aria-pressed={sel === p.voice}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    trigger(p.voice);
                  }}
                  onPointerUp={audio}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      trigger(p.voice);
                    }
                  }}
                >
                  <span className={`sp-pad-dot ${used ? "is-used" : ""}`} />
                  <span className="sp-pad-name">{labels[pi]}</span>
                  {/* Its key on the keyboard, small in its corner, on a
                      desktop (Joe, 2026-10-21). */}
                  <span className="sp-pad-key" aria-hidden>
                    {p.key}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Reset and clear (Joe, 2026-10-21), under the pads (the steps reach
              down level with them), each for the chosen sound: reset puts
              its steps back as the preset has them, clear empties them. */}
          <div className="sp-foot">
            <button type="button" className="sp-foot-btn" aria-label={`Reset ${selLabel}`} onClick={reset}>
              Reset
            </button>
            <button type="button" className="sp-foot-btn" aria-label={`Clear ${selLabel}`} onClick={clearSel}>
              Clear
            </button>
          </div>
        </div>

        <div className="sp-sec sp-sec-steps">
          <div className={`sp-steps ${len === 32 ? "is-32" : ""}`}>
            {/* (A tuned pad's steps can be held to change their notes.) */}
            {pattern[sel].slice(0, len).map((on, s) => (
              <button
                key={s}
                type="button"
                className={`sp-step ${step === s ? "is-now" : ""} ${selTuned ? "is-tuned" : ""} ${shift[sel]?.[s] ? "is-moved" : ""}`}
                aria-label={`${selLabel} step ${s + 1}${selTuned ? `, ${noteName(shiftHz(tuneHz(kit, key, s, sel), shift, sel, s))}: hold and drag to change the note` : ""}`}
                aria-pressed={on}
                onPointerDown={(ev) => holdStart(s, ev)}
                onPointerMove={holdMove}
                onPointerUp={holdEnd}
                onPointerCancel={holdEnd}
                onClick={() => {
                  if (heldClick.current) {
                    heldClick.current = false;
                    return;
                  }
                  toggle(s);
                }}
              >
                {/* (Its note on it, Joe, 2026-10-21: "so you know which one is
                    selected"; the held one live as it's dragged, named above
                    it too.) */}
                {selTuned && <span className="sp-step-name">{noteName(held?.s === s ? held.hz : shiftHz(tuneHz(kit, key, s, sel), shift, sel, s))}</span>}
                {held?.s === s && <span className="sp-step-note">{noteName(held.hz)}</span>}
              </button>
            ))}
          </div>
        </div>
        {/* The pitch wheel, on a desktop, to the right of the steps. */}
        <PitchWheel className="sp-wheel-desk" value={bend} onChange={bendTo} />
      </div>
    </div>
  );
}
