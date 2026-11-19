// The drum machine's key (Joe, 2026-10-21: "make sure the audio autotunes
// into the same key", then "just be able to choose the key it's in in the
// main display"): chosen in the display, and followed by the vocals'
// auto-tune, the 808 and the melodic pad (kits.ts), so they all agree. (For a while it was
// read from the notes in a keys' loop, which went with the keys.)

export type MusicKey = { tonic: number; minor: boolean }; // tonic: a pitch class, 0 is C

// Every key, for the chooser: minor and major on each note from C.
export const ALL_KEYS: MusicKey[] = Array.from({ length: 24 }, (_, i) => ({ tonic: i >> 1, minor: i % 2 === 1 }));
export const keyId = ({ tonic, minor }: MusicKey) => `${tonic}${minor ? "m" : ""}`;
export const keyFromId = (id: string): MusicKey => ({ tonic: parseInt(id, 10) % 12, minor: id.endsWith("m") });

// The key's scale, as pitch classes from C.
export function scaleOf({ tonic, minor }: MusicKey): number[] {
  return (minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map((n) => (n + tonic) % 12);
}

// The 808's note: the tonic, low (within six semitones of A at 55Hz).
export function rootHz({ tonic }: MusicKey): number {
  let n = (tonic - 9 + 12) % 12;
  if (n > 6) n -= 12;
  return 55 * 2 ** (n / 12);
}

// The name, for the display (A minor is "Am").
const NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export function keyName({ tonic, minor }: MusicKey): string {
  return NAMES[tonic] + (minor ? "m" : "");
}
