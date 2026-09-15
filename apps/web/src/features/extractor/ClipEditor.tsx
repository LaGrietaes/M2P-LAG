/**
 * ClipEditor — "Download Options" panel.
 * Right column of the Configure screen: mode/content-type switches, format
 * selection (resolution/preset for video, codec for audio, format for
 * transcript), and time-range control.
 */

import { useMemo, useState } from "react";
import type { FormatOption, InspectResponse } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormatTable } from "../../components/ui/FormatTable";
import { useDevMode } from "../../lib/devMode";

type PrimaryTrack = "video" | "audio";
type Mode = "clip" | "full";
type VideoPreset = "compatible" | "high_quality";
type AudioPreset = "mp3" | "original";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (start: number, end: number, format: "mp4" | "mp3") => void;
  isExtracting: boolean;
  maxClipSeconds: number | null;
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string | null) => void;
  b1tBalance: number | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseTime(value: string): number | null {
  const match = value.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function hasHevc(formats: FormatOption[]): boolean {
  return formats.some(
    (f) =>
      f.vcodec?.toLowerCase().includes("hevc") ||
      f.vcodec?.toLowerCase().includes("h265") ||
      f.codec?.toLowerCase().includes("hevc") ||
      f.codec?.toLowerCase().includes("h265"),
  );
}

interface ResolutionChoice {
  label: string;
  formatId: string;
}

function getResolutionChoices(formats: FormatOption[]): {
  choices: ResolutionChoice[];
  max: ResolutionChoice | null;
} {
  const byHeight = new Map<number, FormatOption>();
  for (const f of formats) {
    if (!f.height || f.height <= 0) continue;
    const current = byHeight.get(f.height);
    if (!current || (f.tbr ?? 0) > (current.tbr ?? 0)) {
      byHeight.set(f.height, f);
    }
  }
  const heights = Array.from(byHeight.keys()).sort((a, b) => a - b);
  const choices = heights.map((h) => ({
    label: `${h}p`,
    formatId: byHeight.get(h)!.format_id,
  }));
  const maxHeight = heights.at(-1);
  const max =
    maxHeight !== undefined
      ? { label: "MAX", formatId: byHeight.get(maxHeight)!.format_id }
      : null;
  return { choices, max };
}

export function ClipEditor({
  media,
  onExtract,
  isExtracting,
  maxClipSeconds,
  selectedFormatId,
  onSelectFormat,
  b1tBalance,
  mode,
  onModeChange,
}: ClipEditorProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inText, setInText] = useState(formatTime(0));
  const [outText, setOutText] = useState(formatTime(0));
  const [showError, setShowError] = useState<string | null>(null);
  const [primaryTrack, setPrimaryTrack] = useState<PrimaryTrack>("video");
  const [videoPreset, setVideoPreset] = useState<VideoPreset>("compatible");
  const [audioPreset, setAudioPreset] = useState<AudioPreset>("mp3");
  const [formatTab, setFormatTab] = useState<"standard" | "advanced">("standard");

  const [hovered, setHovered] = useState(false);
  const { isDeveloper } = useDevMode();

  const { choices: resolutionChoices, max: maxChoice } = useMemo(
    () => getResolutionChoices(media.formats),
    [media.formats],
  );
  const hevcAvailable = hasHevc(media.formats);

  const duration = media.duration ?? 0;
  const selectedDuration = outPoint - inPoint;

  const handleInChange = (value: string) => {
    setInText(value);
    const parsed = parseTime(value);
    if (parsed !== null) setInPoint(parsed);
  };

  const handleOutChange = (value: string) => {
    setOutText(value);
    const parsed = parseTime(value);
    if (parsed !== null) setOutPoint(parsed);
  };

  const handleExtract = () => {
    const targetFormat = primaryTrack === "audio" ? "mp3" : "mp4";
    if (mode === "full") {
      setShowError(null);
      onExtract(0, duration, targetFormat);
      return;
    }
    if (selectedDuration <= 0) {
      setShowError("Please select a segment (set IN and OUT points).");
      return;
    }
    if (maxClipSeconds !== null && selectedDuration > maxClipSeconds) {
      setShowError(
        `Guest extraction limit is ${maxClipSeconds} seconds. ` +
          `Your selection is ${selectedDuration.toFixed(1)} seconds.`,
      );
      return;
    }
    setShowError(null);
    onExtract(inPoint, outPoint, targetFormat);
  };

  const switchClass = (active: boolean) =>
    `flex-1 px-3 py-2 text-xs font-mono font-bold tracking-widest uppercase border transition-colors ${
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-border-subtle text-text-secondary hover:text-text-primary"
    }`;

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-mono border transition-colors ${
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-border-subtle hover:border-accent hover:text-accent"
    }`;

  const getButtonLabel = () => {
    if (isExtracting) return "PREPARING DOWNLOAD…";
    const trackLabel = primaryTrack === "audio" ? "AUDIO" : mode === "clip" ? "CLIP" : "FULL FILE";
    const base = `DOWNLOAD ${trackLabel}`;

    if (maxClipSeconds !== null) {
      return mode === "clip" ? `DOWNLOAD ${trackLabel} (FREE)` : "DOWNLOAD FULL FILE (1 FREE DL)";
    }
    if (isDeveloper && hovered) {
      return `${base} (0 B1T$ [DEV])`;
    }
    const cost = mode === "clip" ? Math.max(1, Math.ceil((selectedDuration || 1) / 60)) : Math.max(1, Math.ceil((duration || 1) / 60));
    return `${base} (${cost} B1T$)`;
  };

  const balanceText = isDeveloper
    ? "∞ B1T$ [OVERRIDE]"
    : b1tBalance !== null
    ? `${b1tBalance} B1T$`
    : "—";

  return (
    <Panel variant="active" className="p-6 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full pointer-events-none"></div>

      {/* Header / Identity Status */}
      <div className="flex justify-between items-start border-b border-border-subtle pb-4">
        <div>
          <h3 className="font-mono text-label-caps text-text-secondary uppercase tracking-widest mb-1">
            Download Options
          </h3>
          <div className="font-bold text-accent tracking-tighter">
            {mode === "clip" ? "TRIM SELECTION" : "ENTIRE FILE"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-label-caps text-text-secondary uppercase tracking-widest mb-1">
            Identity Status
          </div>
          <div className="font-mono text-sm text-text-primary">
            BALANCE:{" "}
            <span className="font-bold text-accent-bright tracking-tight">
              {balanceText}
            </span>
          </div>
        </div>
      </div>

      {/* Top-level switches */}
      <div className="space-y-4">
        <div className="flex gap-1">
          <button onClick={() => onModeChange("clip")} className={switchClass(mode === "clip")}>
            Custom Clip (Trim)
          </button>
          <button onClick={() => onModeChange("full")} className={switchClass(mode === "full")}>
            Full File
          </button>
        </div>
        <div className="flex gap-1">
          {(["video", "audio"] as const).map((track) => (
            <button
              key={track}
              onClick={() => setPrimaryTrack(track)}
              aria-pressed={primaryTrack === track}
              className={switchClass(primaryTrack === track)}
            >
              {track}
            </button>
          ))}
        </div>
        
        {/* Caption toggle removed, leaving only the Locked Transcript v2 option */}
        <div className="space-y-2">
          <button
            disabled
            className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest uppercase border border-border-subtle/30 text-text-secondary/40 flex items-center justify-center gap-2 cursor-not-allowed bg-black/25"
          >
            <span className="w-3 h-3 border border-text-secondary/30 bg-transparent" aria-hidden="true" />
            + AI Transcript (Locked - v2)
          </button>
        </div>
      </div>

      {primaryTrack === "video" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-label-caps text-text-secondary uppercase tracking-widest">
              Video Format
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => setVideoPreset("compatible")}
                aria-pressed={videoPreset === "compatible"}
                className={chipClass(videoPreset === "compatible")}
              >
                Compatible (H.264)
              </button>
              {hevcAvailable && (
                <button
                  onClick={() => setVideoPreset("high_quality")}
                  aria-pressed={videoPreset === "high_quality"}
                  className={chipClass(videoPreset === "high_quality")}
                >
                  High Quality (H.265)
                </button>
              )}
            </div>
          </div>

          {resolutionChoices.length > 0 && (
            <div className="space-y-2">
              <label className="text-label-caps text-text-secondary uppercase tracking-widest">
                Resolution
              </label>
              <div className="flex flex-wrap gap-1">
                {resolutionChoices.map((choice) => (
                  <button
                    key={choice.formatId}
                    onClick={() => onSelectFormat(choice.formatId)}
                    aria-pressed={selectedFormatId === choice.formatId}
                    className={chipClass(selectedFormatId === choice.formatId)}
                  >
                    {choice.label}
                  </button>
                ))}
                {maxChoice && (
                  <button
                    onClick={() => onSelectFormat(maxChoice.formatId)}
                    aria-pressed={selectedFormatId === maxChoice.formatId}
                    className={chipClass(selectedFormatId === maxChoice.formatId)}
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex border-b border-border-subtle">
              <button
                onClick={() => setFormatTab("standard")}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase transition-colors ${
                  formatTab === "standard"
                    ? "text-accent border-b-2 border-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setFormatTab("advanced")}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase transition-colors ${
                  formatTab === "advanced"
                    ? "text-accent border-b-2 border-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Advanced
              </button>
            </div>
            {formatTab === "advanced" && (
              <div className="max-h-64 overflow-y-auto">
                <FormatTable
                  formats={media.formats}
                  selectedId={selectedFormatId}
                  onSelect={onSelectFormat}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {primaryTrack === "audio" && (
        <div className="space-y-2">
          <label className="text-label-caps text-text-secondary uppercase tracking-widest">
            Audio format
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => setAudioPreset("mp3")}
              aria-pressed={audioPreset === "mp3"}
              className={chipClass(audioPreset === "mp3")}
            >
              MP3
            </button>
            <button
              onClick={() => setAudioPreset("original")}
              aria-pressed={audioPreset === "original"}
              className={chipClass(audioPreset === "original")}
            >
              Original
            </button>
          </div>
          <p className="text-[11px] font-mono text-text-secondary/70 pt-1">
            Extracts audio stream encoded in high-quality 320kbps MP3.
          </p>
        </div>
      )}

      {/* Time-range controller */}
      {mode === "clip" ? (
        <div className="space-y-4 font-mono">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-label-caps text-text-secondary uppercase">
              <span>Start Time (IN)</span>
              <span className="text-text-primary tabular-nums">{inText}</span>
            </div>
            <input
              aria-label="In point"
              type="text"
              value={inText}
              onChange={(e) => handleInChange(e.target.value)}
              placeholder="00:00"
              className="w-full bg-background/80 text-text-primary px-3 py-2 border border-border-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent tabular-nums"
            />
          </div>

          {duration > 0 && (
            <div className="py-2">
              <input
                type="range"
                min={0}
                max={Math.floor(duration)}
                value={inPoint}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInPoint(v);
                  setInText(formatTime(v));
                }}
                className="tactile-slider"
                aria-label="In point slider"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-label-caps text-text-secondary uppercase">
              <span>End Time (OUT)</span>
              <span className="text-text-primary tabular-nums">{outText}</span>
            </div>
            <input
              aria-label="Out point"
              type="text"
              value={outText}
              onChange={(e) => handleOutChange(e.target.value)}
              placeholder="00:00"
              className="w-full bg-background/80 text-text-primary px-3 py-2 border border-border-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent tabular-nums"
            />
          </div>

          {duration > 0 && (
            <div className="py-2">
              <input
                type="range"
                min={0}
                max={Math.floor(duration)}
                value={outPoint}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setOutPoint(v);
                  setOutText(formatTime(v));
                }}
                className="tactile-slider"
                aria-label="Out point slider"
              />
            </div>
          )}

          <div className="flex justify-between items-center py-3 border-t border-b border-border-subtle">
            <span className="text-label-caps text-text-secondary uppercase tracking-widest">
              Selected duration
            </span>
            <span className="text-text-primary tabular-nums">
              {selectedDuration.toFixed(1)} sec
            </span>
          </div>

          {maxClipSeconds !== null && selectedDuration > maxClipSeconds && (
            <div className="text-sm text-accent-error">
              (exceeds {maxClipSeconds}s guest limit)
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-t border-b border-border-subtle">
            <span className="text-label-caps text-text-secondary uppercase tracking-widest">
              Total Duration
            </span>
            <span className="text-text-primary font-mono tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          <StatusBadge tone={maxClipSeconds !== null ? "accent" : "default"}>
            {maxClipSeconds !== null
              ? "Guest Account: 1 free full download"
              : "Registered Account"}
          </StatusBadge>
        </div>
      )}

      {showError && (
        <div className="p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
          {showError}
        </div>
      )}

      <div className="pt-2 border-t border-border-subtle">
        <Button
          onClick={handleExtract}
          disabled={isExtracting || (mode === "clip" && selectedDuration <= 0)}
          className="w-full py-4 text-lg glitch-text-hover"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="glitch-target">{getButtonLabel()}</span>
        </Button>
      </div>
    </Panel>
  );
}
