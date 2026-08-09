/**
 * DeliverPanel — result summary, download CTA, countdown timer (spec §5).
 */

import { useEffect, useState } from "react";
import { Panel } from "./ui/Panel";
import { Button } from "./ui/Button";
import { downloadFile } from "../lib/api";
import type { ExtractResponse } from "../types";

interface DeliverPanelProps {
  extractResult: ExtractResponse;
  onRestart: () => void;
}

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export function DeliverPanel({ extractResult, onRestart }: DeliverPanelProps) {
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (typeof extractResult.expires_at !== "number") return null;
    return Math.max(0, extractResult.expires_at - Date.now() / 1000);
  });
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">(
    "idle",
  );

  useEffect(() => {
    const expiresAt = extractResult.expires_at;
    if (typeof expiresAt !== "number") return;
    const timer = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [extractResult.expires_at]);

  const handleDownload = async () => {
    setDownloadState("pending");
    try {
      const blob = await downloadFile(extractResult.file_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `m2p_clip_${extractResult.file_id.slice(0, 8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  };

  return (
    <div className="text-center space-y-6">
      <Panel variant="active" className="p-8 max-w-3xl mx-auto relative">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-accent" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-accent" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-accent" />

        <div className="flex flex-col items-center gap-4 mb-8">
          <h2 className="font-display font-black text-2xl md:text-3xl text-text-primary uppercase tracking-tight">
            RESULT READY
          </h2>
          <p className="font-mono text-xs text-text-secondary uppercase tracking-widest">
            Extraction cycle completed successfully.
          </p>
        </div>

        <div className="border-y border-border-subtle py-6 mb-8 grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 border-r border-border-subtle pr-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase">
              Format
            </span>
            <span className="font-mono text-sm text-text-primary">
              {extractResult.format || "MP4"}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-r border-border-subtle px-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase">
              Status
            </span>
            <span className="font-mono text-sm text-text-primary uppercase">
              {extractResult.status}
            </span>
          </div>
          <div className="flex flex-col gap-1 pl-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase">
              File ID
            </span>
            <span className="font-mono text-sm text-text-primary truncate">
              {extractResult.file_id.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <Button
            onClick={handleDownload}
            disabled={downloadState === "pending"}
            className="w-full py-4 text-lg"
          >
            {downloadState === "pending" ? "PREPARING…" : "DOWNLOAD FILE"}
          </Button>
        </div>

        {downloadState === "error" && (
          <div className="mt-4 max-w-md mx-auto p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
            Download failed. The file may have expired, or you may not have
            access to it. Try extracting again.
          </div>
        )}

        {remaining !== null && (
          <div className="mt-6 flex items-center justify-center gap-3 px-6 py-2 bg-background/40 border border-border-subtle">
            <span className="font-mono text-xs text-text-secondary animate-pulse">
              FILE PERSISTENCE:
            </span>
            <span className="font-mono text-sm text-accent tabular-nums">
              {formatRemaining(remaining)}
            </span>
          </div>
        )}
      </Panel>

      <button
        onClick={onRestart}
        className="font-mono text-label-caps text-text-secondary hover:text-text-primary uppercase tracking-[0.2em] transition-colors"
      >
        {"\u2190"} START NEW SOURCE
      </button>
    </div>
  );
}