/**
 * SourceCard — Video preview + metadata + actions.
 */

import { useState } from "react";
import { Panel } from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { InspectResponse } from "../../types";
import { useDevMode } from "../../lib/devMode";

interface SourceCardProps {
  media: InspectResponse;
  onExtract?: () => void;
  onPreview?: () => void;
  onDownloadSource?: () => void;
  freeDownloadBadge?: "available" | "used" | null;
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

export function SourceCard({
  media,
  onExtract,
  onPreview,
  onDownloadSource,
  freeDownloadBadge,
}: SourceCardProps) {
  const { isDeveloper } = useDevMode();
  const [hoverTrim, setHoverTrim] = useState(false);
  const [hoverFull, setHoverFull] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const getTrimLabel = () => {
    if (isDeveloper && hoverTrim) {
      return "TRIM SELECTION (0 B1T$ [DEV])";
    }
    return "TRIM / CUSTOM CLIP";
  };

  const getFullLabel = () => {
    if (freeDownloadBadge === "available") {
      return "DOWNLOAD FULL FILE (FREE)";
    }
    if (isDeveloper && hoverFull) {
      return "DOWNLOAD FULL FILE (0 B1T$ [DEV])";
    }
    return "DOWNLOAD FULL FILE";
  };

  const isYoutube =
    media.platform?.toLowerCase().includes("youtube") ||
    media.webpage_url?.includes("youtube.com") ||
    media.webpage_url?.includes("youtu.be");
  
  const isVimeo =
    media.platform?.toLowerCase().includes("vimeo") ||
    media.webpage_url?.includes("vimeo.com");

  return (
    <div className="flex flex-col gap-4">
      {/* Video preview frame */}
      <Panel variant="active" className="relative aspect-video overflow-hidden bg-black">
        {/* Corner HUD accents - only show if not playing preview to allow video interaction */}
        {!isPlayingPreview && (
          <div className="absolute inset-0 pointer-events-none z-10 border border-border-subtle m-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent opacity-50"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent opacity-50"></div>
            <div className="absolute top-2 left-2 font-mono text-[10px] font-bold tracking-widest text-accent bg-background/80 px-2 py-1">
              REC // LIVE
            </div>
            <div className="absolute bottom-2 right-2 font-mono text-[10px] tracking-widest text-text-secondary bg-background/80 px-2 py-1">
              Duration: {formatDuration(media.duration)}
            </div>
          </div>
        )}

        {isPlayingPreview && (isYoutube || isVimeo) ? (
          <iframe
            src={
              isYoutube
                ? `https://www.youtube.com/embed/${media.id}?autoplay=1`
                : `https://player.vimeo.com/video/${media.id}?autoplay=1`
            }
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : media.thumbnail ? (
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-full h-full object-cover opacity-80 mix-blend-luminosity filter contrast-125 saturate-50"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            <span className="font-mono text-sm">NO_PREVIEW_AVAILABLE</span>
          </div>
        )}
      </Panel>

      {/* Metadata */}
      <Panel className="p-4 space-y-2">
        <h2 className="text-xl font-bold text-text-primary">{media.title}</h2>
        <div className="flex flex-wrap gap-2 text-sm text-text-secondary font-mono">
          {media.creator && <span>{media.creator}</span>}
          {media.creator && media.platform && <span>•</span>}
          {media.platform && <span>{media.platform}</span>}
          {media.duration && <span>•</span>}
          {media.duration && <span>{formatDuration(media.duration)}</span>}
        </div>
        {media.upload_date && (
          <p className="text-sm text-text-secondary">
            Published: {media.upload_date}
          </p>
        )}
        {media.webpage_url && (
          <a
            href={media.webpage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-secondary hover:text-text-primary truncate block font-mono"
          >
            {media.webpage_url}
          </a>
        )}
      </Panel>

      {/* Free download badge */}
      {freeDownloadBadge && (
        <StatusBadge
          tone={freeDownloadBadge === "available" ? "accent" : "default"}
        >
          {freeDownloadBadge === "available"
            ? "1 FREE FULL DOWNLOAD AVAILABLE"
            : "FREE DOWNLOAD USED — Register or buy B1T$ for more"}
        </StatusBadge>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            setIsPlayingPreview((prev) => !prev);
            onPreview?.();
          }}
          className={`px-4 py-2 text-sm font-mono font-medium border transition-colors ${
            isPlayingPreview
              ? "border-accent bg-accent/20 text-white"
              : "text-text-primary bg-transparent border-border-subtle hover:bg-surface-elevated"
          }`}
        >
          {isPlayingPreview ? "STOP PREVIEW" : "PLAY PREVIEW"}
        </button>
        <button
          onClick={onExtract}
          className="px-4 py-2 text-sm font-mono font-medium text-white bg-accent hover:bg-brand-red-dark transition-colors glitch-text-hover"
          onMouseEnter={() => setHoverTrim(true)}
          onMouseLeave={() => hoverTrim && setHoverTrim(false)}
        >
          <span className="glitch-target">{getTrimLabel()}</span>
        </button>
        {onDownloadSource && (
          <button
            onClick={onDownloadSource}
            className="px-4 py-2 text-sm font-mono font-medium text-text-primary bg-transparent border border-border-subtle hover:bg-surface-elevated transition-colors glitch-text-hover"
            onMouseEnter={() => setHoverFull(true)}
            onMouseLeave={() => hoverFull && setHoverFull(false)}
          >
            <span className="glitch-target">{getFullLabel()}</span>
          </button>
        )}
      </div>
    </div>
  );
}
