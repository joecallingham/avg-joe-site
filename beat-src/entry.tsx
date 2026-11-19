// Avg Joe: mounts the drum machine from the Sumo Joe Studio site (SynthPlayer.tsx, kits.ts,
// samples.ts, musicKey.ts, copied from its v2 branch) and lets the page open and close it.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import SynthPlayer from "./SynthPlayer";

declare global { interface Window { AvgBeat?: { open(): void; close(): void; toggle(): void } } }

function App() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    window.AvgBeat = { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen((o) => !o) };
    window.dispatchEvent(new Event("avgbeat-ready"));
  }, []);
  useEffect(() => { window.dispatchEvent(new CustomEvent("avgbeat", { detail: open })); }, [open]);
  return <SynthPlayer open={open} onClose={() => setOpen(false)} />;
}

const host = document.createElement("div");
host.id = "avg-beat";
document.body.appendChild(host);
createRoot(host).render(<App />);
