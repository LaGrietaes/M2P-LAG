/**
 * DeliverPanel — result summary, download CTA, countdown timer, and viral share link.
 */

import { useEffect, useState } from "react";
import { Panel } from "./ui/Panel";
import { Button } from "./ui/Button";
import { downloadFile } from "../lib/api";
import type { ExtractResponse, InspectResponse } from "../types";

interface DeliverPanelProps {
  extractResult: ExtractResponse;
  onRestart: () => void;
  media?: InspectResponse | null;
  videoTitle?: string | null;
  thumbnailUrl?: string | null;
  creator?: string | null;
  duration?: number | null;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export function DeliverPanel({
  extractResult,
  onRestart,
  media,
  videoTitle,
  thumbnailUrl,
  creator,
  duration,
}: DeliverPanelProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (typeof extractResult.expires_at !== "number") return null;
    return Math.max(0, extractResult.expires_at - Date.now() / 1000);
  });
  const [downloadState, setDownloadState] = useState<"idle" | "pending" | "error">(
    "idle",
  );
  const [copied, setCopied] = useState(false);

  const displayThumbnail = media?.thumbnail || thumbnailUrl;
  const displayTitle = media?.title || videoTitle;
  const displayCreator = media?.creator || creator;
  const displayDuration = media?.duration ?? duration;

  const isYoutube =
    media?.platform?.toLowerCase().includes("youtube") ||
    media?.webpage_url?.includes("youtube.com") ||
    media?.webpage_url?.includes("youtu.be");

  const isVimeo =
    media?.platform?.toLowerCase().includes("vimeo") ||
    media?.webpage_url?.includes("vimeo.com");

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

      const fileExt = extractResult.format || "mp4";
      const baseName = videoTitle
        ? videoTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_")
        : `m2p_clip_${extractResult.file_id.slice(0, 8)}`;
      
      link.download = `${baseName}_by_LaGrieta.${fileExt}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  };

  const shareUrl = `${window.location.origin}/?ref=m2p_${extractResult.file_id.slice(0, 8)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center space-y-6">
      <Panel variant="active" className="p-8 max-w-3xl mx-auto relative">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-accent" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-accent" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-accent" />

        <div className="flex flex-col items-center gap-2 mb-6">
          <h2 className="font-display font-black text-2xl md:text-3xl text-text-primary uppercase tracking-tight">
            YOUR DOWNLOAD IS READY
          </h2>
          <p className="font-mono text-xs text-text-secondary uppercase tracking-widest">
            Media extraction complete. Save file directly to device.
          </p>
        </div>

        {/* Primary Action Hero */}
        <div className="w-full max-w-md mx-auto space-y-3 mb-8">
          <Button
            onClick={handleDownload}
            disabled={downloadState === "pending" || remaining === 0}
            className="w-full py-4 text-lg font-bold shadow-[0_0_20px_rgba(217,4,41,0.3)] glitch-text-hover"
          >
            <span className="glitch-target">
              {remaining === 0
                ? "FILE EXPIRED"
                : downloadState === "pending"
                ? "PREPARING…"
                : "DOWNLOAD FILE"}
            </span>
          </Button>

          {/* Countdown timer */}
          {remaining !== null && (
            <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#040508]/80 border border-border-subtle text-xs">
              <span className="font-mono text-text-secondary">
                {remaining > 0 ? "FILE AVAILABLE FOR:" : "FILE STATUS:"}
              </span>
              <span
                className={`font-mono text-sm tabular-nums font-bold ${
                  remaining > 0 ? "text-accent-bright" : "text-accent-error"
                }`}
              >
                {remaining > 0 ? formatRemaining(remaining) : "EXPIRED (PURGED)"}
              </span>
            </div>
          )}
        </div>

        {/* File Format, Status & Reference */}
        <div className="border-y border-border-subtle py-4 mb-6 grid grid-cols-3 gap-4 bg-surface/30">
          <div className="flex flex-col gap-0.5 border-r border-border-subtle pr-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase text-[10px]">
              File Format
            </span>
            <span className="font-mono text-sm text-text-primary uppercase font-bold">
              {extractResult.format || "MP4"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-r border-border-subtle px-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase text-[10px]">
              Status
            </span>
            <span className="font-mono text-sm text-[#10b981] uppercase font-bold">
              {extractResult.status}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 pl-4">
            <span className="font-mono text-label-caps text-text-secondary uppercase text-[10px]">
              Reference ID
            </span>
            <span className="font-mono text-sm text-text-primary truncate">
              {extractResult.file_id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Media Preview & Metadata confirmation */}
        {(displayThumbnail || isPlayingPreview) && (
          <div className="space-y-3 max-w-lg mx-auto mb-6">
            <div className="relative aspect-video overflow-hidden bg-black border border-border-subtle">
              {!isPlayingPreview && (
                <div className="absolute inset-0 pointer-events-none z-10 border border-border-subtle m-2">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent opacity-75" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent opacity-75" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent opacity-75" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent opacity-75" />
                  <div className="absolute top-1.5 left-1.5 font-mono text-[9px] font-bold tracking-widest text-accent bg-background/80 px-1.5 py-0.5">
                    READY // PROCESSED
                  </div>
                  {displayDuration && (
                    <div className="absolute bottom-1.5 right-1.5 font-mono text-[9px] tracking-widest text-text-secondary bg-background/80 px-1.5 py-0.5">
                      Duration: {formatDuration(displayDuration)}
                    </div>
                  )}
                </div>
              )}

              {isPlayingPreview && (isYoutube || isVimeo) ? (
                <iframe
                  src={
                    isYoutube
                      ? `https://www.youtube.com/embed/${media?.id}?autoplay=1`
                      : `https://player.vimeo.com/video/${media?.id}?autoplay=1`
                  }
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              ) : displayThumbnail ? (
                <img
                  src={displayThumbnail}
                  alt={displayTitle || "Media preview"}
                  className="w-full h-full object-cover opacity-85 mix-blend-luminosity filter contrast-125 saturate-50 hover:opacity-100 hover:mix-blend-normal transition-all"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                  <span className="font-mono text-xs">NO_PREVIEW_AVAILABLE</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {displayTitle && (
                <span className="font-mono text-xs text-text-primary truncate text-left max-w-[70%]">
                  {displayTitle} {displayCreator && <span className="text-text-secondary">({displayCreator})</span>}
                </span>
              )}
              {(isYoutube || isVimeo) && (
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview((prev) => !prev)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-medium border transition-colors ${
                    isPlayingPreview
                      ? "border-accent bg-accent/20 text-white"
                      : "text-text-primary bg-transparent border-border-subtle hover:bg-surface-elevated"
                  }`}
                >
                  {isPlayingPreview ? "STOP PREVIEW" : "PLAY PREVIEW"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Share Link Widget */}
        <div className="w-full max-w-md mx-auto space-y-4">
          <div className="border border-border-subtle bg-white/5 p-4 space-y-2 text-left font-mono">
            <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
              Share download link
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                aria-label="Share download URL"
                className="flex-1 bg-[#040508] border border-border-subtle px-3 py-1.5 text-xs text-text-secondary focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-1.5 text-xs border border-accent bg-accent/10 text-accent hover:bg-accent/25 transition-colors font-bold uppercase"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {downloadState === "error" && (
          <div className="mt-4 max-w-md mx-auto p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
            Download failed. The file may have expired, or you may not have
            access to it. Try extracting again.
          </div>
        )}
      </Panel>

      <button
        onClick={onRestart}
        className="font-mono text-label-caps text-text-secondary hover:text-text-primary uppercase tracking-[0.2em] transition-colors"
      >
        {"\u2190"} START NEW DOWNLOAD
      </button>
    </div>
  );
}