/**
 * ExtractionProgress — pixel-grid "wow moment" (spec §5).
 * Central pixel-grid gauge, percentage readout, stats bar, event-log panel.
 */

import { useMemo, useState } from "react";
import { Panel } from "./ui/Panel";
import { useExtractionProgress } from "../hooks/useExtractionProgress";

interface ExtractionProgressProps {
  isPending: boolean;
  label?: string;
}

const EVENTS: { level: "info" | "warn"; text: string }[] = [
  { level: "info", text: "Establishing secure connection to source origin…" },
  { level: "info", text: "Handshake verified. Allocating decode buffers…" },
  { level: "warn", text: "Signal fluctuation detected. Compensating phase drift…" },
  { level: "info", text: "Stream synchronized. Preparing extraction pipeline…" },
  { level: "info", text: "Buffer allocated successfully." },
  { level: "info", text: "Awaiting delivery node acknowledgement…" },
];

function randomHex(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, "0");
}

export function ExtractionProgress({
  isPending,
  label = "EXTRACTING SIGNAL...",
}: ExtractionProgressProps) {
  const progress = useExtractionProgress(isPending);
  const filled = Math.floor(progress);
  const pixels = useMemo(() => Array.from({ length: 100 }), []);
  // Decorative flavor text only — generated once via a lazy initializer
  // (React's sanctioned one-time-impure-call escape hatch), not recomputed
  // on every render.
  const [streamLines] = useState(() =>
    Array.from({ length: 12 }, () => [randomHex(), randomHex()] as const),
  );
  const header = isPending ? label : "EXTRACTION COMPLETE";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Left: raw stream log */}
      <Panel className="hidden md:flex col-span-3 flex-col p-4 gap-2 border-r border-border-subtle">
        <div className="font-mono text-label-caps text-text-primary uppercase tracking-widest flex justify-between border-b border-border-subtle pb-2">
          <span>Raw stream</span>
          <span className="animate-pulse">▾</span>
        </div>
        <div className="flex-1 overflow-hidden space-y-1 text-[10px] font-mono text-text-secondary leading-tight">
          {streamLines.map(([left, right], i) => (
            <div key={i} className="text-right opacity-70">
              0x{left} <span className="opacity-50">…</span> 0x{right}
            </div>
          ))}
        </div>
      </Panel>

      {/* Central: pixel grid gauge */}
      <div className="col-span-1 md:col-span-6 flex flex-col items-center justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="font-mono text-label-caps text-text-secondary tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-accent animate-pulse" />
            System active
          </div>
          <h2 className="font-display font-black text-3xl md:text-5xl text-text-primary tracking-tight text-center">
            {header}
          </h2>
        </div>

        <Panel variant="active" className="relative w-[300px] sm:w-[420px] md:w-[480px] aspect-video p-1 bg-background/40">
          <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-[1px]">
            {pixels.map((_, i) => (
              <div key={i} className={i < filled ? "pixel-active" : "pixel-inactive"} />
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="font-display font-black text-text-primary drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] text-6xl leading-none">
              {filled}
              <span className="text-3xl opacity-80">%</span>
            </span>
            <span className="font-mono text-text-primary/90 text-[10px] mt-2 bg-background/60 px-3 py-1 border border-border-subtle">
              DECODE_BUFFER_ACTIVE
            </span>
          </div>
        </Panel>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 gap-px w-full max-w-md">
          <Panel className="p-4 flex flex-col justify-between h-20">
            <span className="font-mono text-label-caps text-text-secondary uppercase tracking-widest">
              Speed
            </span>
            <div className="font-mono text-text-primary text-right flex items-end justify-end gap-1">
              <span className="text-2xl font-bold">45</span>
              <span className="text-sm pb-1">MB/S</span>
            </div>
          </Panel>
          <Panel className="p-4 flex flex-col justify-between h-20">
            <span className="font-mono text-label-caps text-text-secondary uppercase tracking-widest">
              Tasks active
            </span>
            <div className="font-mono text-text-primary text-right text-[11px] leading-tight flex flex-col items-end">
              <span>{">"} DOWNLOAD [OK]</span>
              <span className="animate-pulse text-accent">{">"} CUT [WAIT]</span>
              <span>{">"} TRANSCODE [WAIT]</span>
            </div>
          </Panel>
        </div>
      </div>

      {/* Right: SYS_EVENTS */}
      <Panel className="hidden md:flex col-span-3 flex-col p-4 gap-2 border-l border-border-subtle">
        <div className="font-mono text-label-caps text-text-primary uppercase tracking-widest flex justify-between border-b border-border-subtle pb-2">
          <span>Sys events</span>
          <span>›_</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {EVENTS.map((ev, i) => (
            <div
              key={i}
              className={`p-2 border ${
                ev.level === "warn"
                  ? "bg-accent-error/10 border-l-2 border-l-accent-error"
                  : "bg-surface border-border-subtle"
              }`}
            >
              <div className="flex justify-between text-[10px] font-mono text-text-secondary mb-1">
                <span className={ev.level === "warn" ? "text-accent-error" : ""}>
                  0x
                  {(0xa1f4 + i * 0x1234)
                    .toString(16)
                    .toUpperCase()
                    .padStart(4, "0")}
                </span>
                <span className={ev.level === "warn" ? "text-accent-error" : ""}>
                  [{ev.level.toUpperCase()}]
                </span>
              </div>
              <div className="font-mono text-[12px] text-text-primary">{ev.text}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}