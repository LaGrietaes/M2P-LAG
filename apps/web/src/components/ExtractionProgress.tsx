/**
 * ExtractionProgress — pixel-grid and progress-bar loader.
 * Fully dynamic logs, stage status, speed fluctuations, and tasks active.
 */

import { useMemo, useState, useEffect } from "react";
import { Panel } from "./ui/Panel";
import { useExtractionProgress } from "../hooks/useExtractionProgress";

interface ExtractionProgressProps {
  isPending: boolean;
  label?: string;
}

function randomHex(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .toUpperCase()
    .padStart(6, "0");
}

export function ExtractionProgress({
  isPending,
  label: _label = "PREPARING MEDIA FILE...",
}: ExtractionProgressProps) {
  const progress = useExtractionProgress(isPending);
  const filled = Math.floor(progress);
  const pixels = useMemo(() => Array.from({ length: 100 }), []);

  const [streamLines, setStreamLines] = useState<[string, string][]>([]);

  // Generate random rolling binary hex logs on stream panel
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      setStreamLines((prev) => {
        const next: [string, string] = [randomHex(), randomHex()];
        return [next, ...prev].slice(0, 15);
      });
    }, 400);
    return () => clearInterval(interval);
  }, [isPending]);

  // Dynamic log updates based on progress values
  const dynamicLogs = useMemo(() => {
    const logs = [];
    if (filled >= 5) logs.push({ level: "info" as const, time: "0x3A01", text: "Establishing connection to source host…" });
    if (filled >= 15) logs.push({ level: "info" as const, time: "0x3A08", text: "Handshake verified. Fetching format payloads…" });
    if (filled >= 30) logs.push({ level: "info" as const, time: "0x4F10", text: "Downloading stream chunk 1/3 (32MB)…" });
    if (filled >= 45) logs.push({ level: "info" as const, time: "0x4F15", text: "Downloading stream chunk 2/3 (64MB)…" });
    if (filled >= 55) logs.push({ level: "info" as const, time: "0x51A2", text: "Local stream copy complete. Opening FFmpeg pipeline…" });
    if (filled >= 70) logs.push({ level: "warn" as const, time: "0x51C0", text: "Applying PTS sync corrections. Audio track aligned." });
    if (filled >= 85) logs.push({ level: "info" as const, time: "0x6E0C", text: "Writing final MP4 output container…" });
    if (filled >= 95) logs.push({ level: "info" as const, time: "0x7F22", text: "Writing media catalog record. File cache allocated." });
    return logs.reverse();
  }, [filled]);

  // Current active status and tasks
  const stageInfo = useMemo(() => {
    if (filled < 20) return { title: "STAGE 1/4: INITIALIZING PIPELINE", task: "CONNECT", speed: 0 };
    if (filled < 55) return { title: "STAGE 2/4: ACQUIRING MEDIA DATA", task: "DOWNLOAD", speed: 45 };
    if (filled < 80) return { title: "STAGE 3/4: TRIMMING & PROCESSING", task: "TRIM", speed: 85 };
    if (filled < 95) return { title: "STAGE 4/4: PACKAGING CONTAINER", task: "CONVERT", speed: 120 };
    return { title: "COMPLETING CLEARANCE", task: "DELIVER", speed: 10 };
  }, [filled]);

  const header = isPending ? stageInfo.title : "PREPARATION COMPLETE";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Left: raw stream log */}
      <Panel className="hidden md:flex col-span-3 flex-col p-4 gap-2 border-r border-border-subtle bg-[#040508]/80">
        <div className="font-mono text-label-caps text-text-primary uppercase tracking-widest flex justify-between border-b border-border-subtle pb-2">
          <span>Stream Tracker</span>
          <span className="animate-pulse">▾</span>
        </div>
        <div className="flex-1 overflow-hidden space-y-1 text-[10px] font-mono text-text-secondary leading-tight">
          {streamLines.map(([left, right], i) => (
            <div key={i} className="text-right opacity-70">
              0x{left} <span className="opacity-50">…</span> 0x{right}
            </div>
          ))}
          {streamLines.length === 0 && (
            <div className="text-center opacity-40 py-8">Awaiting stream...</div>
          )}
        </div>
      </Panel>

      {/* Central: pixel grid gauge */}
      <div className="col-span-1 md:col-span-6 flex flex-col items-center justify-center gap-6 py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="font-mono text-label-caps text-text-secondary tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-accent animate-pulse" />
            {isPending ? "System Processing" : "System Ready"}
          </div>
          <h2 className="font-display font-black text-xl md:text-2xl text-text-primary tracking-tight text-center">
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
              {isPending ? "PROCESSING_DATA" : "FINISHED"}
            </span>
          </div>
        </Panel>

        {/* Linear Progress Bar */}
        <div className="w-[300px] sm:w-[420px] md:w-[480px] h-3 bg-white/5 border border-border-subtle p-0.5 overflow-hidden">
          <div
            className="h-full bg-accent-bright shadow-[0_0_10px_rgba(217,4,41,0.6)] transition-all duration-300 ease-out"
            style={{ width: `${filled}%` }}
          />
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 gap-px w-full max-w-md">
          <Panel className="p-4 flex flex-col justify-between h-20 bg-[#040508]/80">
            <span className="font-mono text-label-caps text-text-secondary uppercase tracking-widest">
              Speed
            </span>
            <div className="font-mono text-text-primary text-right flex items-end justify-end gap-1">
              <span className="text-2xl font-bold">{stageInfo.speed}</span>
              <span className="text-sm pb-1">MB/S</span>
            </div>
          </Panel>
          <Panel className="p-4 flex flex-col justify-between h-20 bg-[#040508]/80">
            <span className="font-mono text-label-caps text-text-secondary uppercase tracking-widest">
              Active Tasks
            </span>
            <div className="font-mono text-text-primary text-right text-[11px] leading-tight flex flex-col items-end uppercase">
              <span className={stageInfo.task === "CONNECT" ? "text-accent animate-pulse" : "opacity-40"}>
                {">"} CONNECT {stageInfo.task !== "CONNECT" && "[OK]"}
              </span>
              <span className={stageInfo.task === "DOWNLOAD" ? "text-accent animate-pulse" : (filled >= 55 ? "opacity-40" : "opacity-20")}>
                {">"} DOWNLOAD {filled >= 55 && "[OK]"}
              </span>
              <span className={stageInfo.task === "TRIM" ? "text-accent animate-pulse" : (filled >= 80 ? "opacity-40" : "opacity-20")}>
                {">"} TRIM {filled >= 80 && "[OK]"}
              </span>
              <span className={stageInfo.task === "CONVERT" ? "text-accent animate-pulse" : (filled >= 95 ? "opacity-40" : "opacity-20")}>
                {">"} CONVERT {filled >= 95 && "[OK]"}
              </span>
            </div>
          </Panel>
        </div>
      </div>

      {/* Right: SYS_EVENTS */}
      <Panel className="hidden md:flex col-span-3 flex-col p-4 gap-2 border-l border-border-subtle bg-[#040508]/80">
        <div className="font-mono text-label-caps text-text-primary uppercase tracking-widest flex justify-between border-b border-border-subtle pb-2">
          <span>Processing Log</span>
          <span>›_</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {dynamicLogs.map((ev, i) => (
            <div
              key={i}
              className={`p-2 border transition-all duration-300 ${
                ev.level === "warn"
                  ? "bg-accent-error/10 border-l-2 border-l-accent-error"
                  : "bg-surface border-border-subtle"
              }`}
            >
              <div className="flex justify-between text-[10px] font-mono text-text-secondary mb-1">
                <span className={ev.level === "warn" ? "text-accent-error" : ""}>
                  {ev.time}
                </span>
                <span className={ev.level === "warn" ? "text-accent-error" : ""}>
                  [{ev.level.toUpperCase()}]
                </span>
              </div>
              <div className="font-mono text-[12px] text-text-primary">{ev.text}</div>
            </div>
          ))}
          {dynamicLogs.length === 0 && (
            <div className="text-center opacity-40 py-8 font-mono text-xs">Starting pipeline logs...</div>
          )}
        </div>
      </Panel>
    </div>
  );
}