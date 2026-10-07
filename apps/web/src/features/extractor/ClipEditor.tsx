/**
 * ClipEditor — "Download Options" panel.
 * Right column of the Configure screen: mode/content-type switches, format
 * selection (resolution/preset for video, codec for audio, format for
 * transcript), and time-range control.
 */

import { useMemo, useState, useEffect } from "react";
import type { FormatOption, InspectResponse } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormatTable } from "../../components/ui/FormatTable";
import { useDevMode } from "../../lib/devMode";

type PrimaryTrack = "video" | "audio";
type Mode = "clip" | "full";
type VideoPreset = "compatible" | "prores" | "high_quality" | "original";
type AudioPreset = "mp3" | "wav" | "original";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (
    start: number,
    end: number,
    format: "mp4" | "mp3" | "mov" | "webm" | "wav",
    preset?: string,
  ) => void;
  isExtracting: boolean;
  maxClipSeconds: number | null;
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string | null) => void;
  b1tBalance: number | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  freeDownloadUsed?: boolean;
  onRequireAuth?: () => void;
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

function formatResolutionLabel(height: number): string {
  if (height >= 4320) return `${height}p (8K)`;
  if (height >= 2160) return `${height}p (4K)`;
  if (height >= 1440) return `${height}p (2K)`;
  if (height >= 1080) return `${height}p (FHD)`;
  if (height >= 720) return `${height}p (HD)`;
  return `${height}p`;
}

interface ResolutionChoice {
  label: string;
  formatId: string;
  height: number;
}

function getResolutionChoices(formats: FormatOption[]): {
  choices: ResolutionChoice[];
  max: ResolutionChoice | null;
} {
  const byHeight = new Map<number, FormatOption>();
  for (const f of formats) {
    if (!f.height || f.height <= 0) continue;
    // Exclude storyboard thumbnails
    if (f.ext === "mhtml" || f.format_id?.startsWith("sb")) continue;
    // Exclude audio-only
    if (!f.vcodec || f.vcodec === "none") continue;

    const current = byHeight.get(f.height);
    const isHls = f.protocol?.startsWith("m3u8") || f.ext === "m3u8";
    const currentIsHls = current?.protocol?.startsWith("m3u8") || current?.ext === "m3u8";

    if (!current) {
      byHeight.set(f.height, f);
    } else if (currentIsHls && !isHls) {
      // Prioritize direct HTTP/HTTPS stream over fragmented HLS
      byHeight.set(f.height, f);
    } else if (!currentIsHls && isHls) {
      // Keep direct stream instead of fragmented HLS
      continue;
    } else if ((f.tbr ?? 0) > (current.tbr ?? 0)) {
      byHeight.set(f.height, f);
    }
  }
  // Sort descending: 4K, 2K, 1080p, 720p...
  const heights = Array.from(byHeight.keys()).sort((a, b) => b - a);
  const choices = heights.map((h) => ({
    label: formatResolutionLabel(h),
    formatId: byHeight.get(h)!.format_id,
    height: h,
  }));
  const maxHeight = heights[0];
  const max =
    maxHeight !== undefined
      ? {
          label: `MAX (${formatResolutionLabel(maxHeight)})`,
          formatId: byHeight.get(maxHeight)!.format_id,
          height: maxHeight,
        }
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
  freeDownloadUsed = false,
  onRequireAuth,
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

  // Auto-select MAX resolution if no format is currently selected
  useEffect(() => {
    if (!selectedFormatId && maxChoice) {
      onSelectFormat(maxChoice.formatId);
    }
  }, [selectedFormatId, maxChoice, onSelectFormat]);

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
    let targetFormat: "mp4" | "mov" | "webm" | "mp3" | "wav" = "mp4";
    let activePreset: string = videoPreset;

    if (primaryTrack === "audio") {
      targetFormat = audioPreset === "wav" ? "wav" : "mp3";
      activePreset = audioPreset;
    } else {
      targetFormat = videoPreset === "prores" ? "mov" : "mp4";
      activePreset = videoPreset;
    }

    if (mode === "full") {
      if (maxClipSeconds !== null && freeDownloadUsed) {
        setShowError("You have used your 1 free full download. Please log in or buy B1T$ to continue.");
        onRequireAuth?.();
        return;
      }
      setShowError(null);
      onExtract(0, duration, targetFormat, activePreset);
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
    onExtract(inPoint, outPoint, targetFormat, activePreset);
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

  const presetCardClass = (active: boolean) =>
    `p-2.5 text-left border transition-all ${
      active
        ? "border-accent bg-accent/10 text-text-primary shadow-[inset_0_0_12px_rgba(255,51,51,0.15)]"
        : "border-border-subtle bg-background/40 hover:border-border-subtle/80 hover:bg-surface-elevated/40 text-text-secondary"
    }`;

  const getButtonLabel = () => {
    if (isExtracting) return "PREPARING DOWNLOAD…";
    let ext = "MP4";
    if (primaryTrack === "audio") {
      ext = audioPreset === "wav" ? "WAV" : "MP3";
    } else if (videoPreset === "prores") {
      ext = "MOV";
    }
    const trackLabel = primaryTrack === "audio" ? `AUDIO (${ext})` : mode === "clip" ? `CLIP (${ext})` : `FULL FILE (${ext})`;
    const base = `DOWNLOAD ${trackLabel}`;

    if (maxClipSeconds !== null) {
      if (mode === "clip") {
        return `DOWNLOAD ${trackLabel} (FREE)`;
      }
      if (freeDownloadUsed) {
        return `DOWNLOAD FULL FILE (${ext}) (LOGIN / BUY B1T$)`;
      }
      return `DOWNLOAD FULL FILE (${ext}) (1 FREE DL)`;
    }
    if (isDeveloper && hovered) {
      return `${base} (0 B1T$ [DEV])`;
    }
    if (mode === "clip") {
      const cost = Math.max(1, Math.ceil((selectedDuration || 1) / 60));
      return `${base} (${cost} B1T$)`;
    } else {
      const selectedFormat = media.formats?.find((f) => f.format_id === selectedFormatId);
      const estimatedMb = selectedFormat?.filesize
        ? Math.round(selectedFormat.filesize / (1024 * 1024))
        : Math.round(((selectedFormat?.tbr || 2500) * 1000 / 8 * duration) / (1024 * 1024));
      const cost = Math.max(1, Math.ceil(estimatedMb / 50));
      return `${base} (~${cost} B1T$)`;
    }
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
        
        {/* Segment Selection (Time Range Controller) */}
        {mode === "clip" ? (
          <div className="space-y-3 font-mono p-3 bg-surface/40 border border-border-subtle">
            <div className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center justify-between border-b border-border-subtle/40 pb-1.5">
              <span>01 // Select Segment Range</span>
              <span className="text-text-primary tabular-nums font-mono">{selectedDuration.toFixed(1)}s</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] text-text-secondary uppercase">
                  <span>Start Time (IN)</span>
                  <span className="text-text-primary tabular-nums">{inText}</span>
                </div>
                <input
                  aria-label="In point"
                  type="text"
                  value={inText}
                  onChange={(e) => handleInChange(e.target.value)}
                  placeholder="00:00"
                  className="w-full bg-background/80 text-text-primary px-2.5 py-1.5 text-xs border border-border-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent tabular-nums"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] text-text-secondary uppercase">
                  <span>End Time (OUT)</span>
                  <span className="text-text-primary tabular-nums">{outText}</span>
                </div>
                <input
                  aria-label="Out point"
                  type="text"
                  value={outText}
                  onChange={(e) => handleOutChange(e.target.value)}
                  placeholder="00:00"
                  className="w-full bg-background/80 text-text-primary px-2.5 py-1.5 text-xs border border-border-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent tabular-nums"
                />
              </div>
            </div>

            {duration > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary font-mono w-7">IN</span>
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
                    className="tactile-slider flex-1"
                    aria-label="In point slider"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary font-mono w-7">OUT</span>
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
                    className="tactile-slider flex-1"
                    aria-label="Out point slider"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-border-subtle/40 text-xs">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                Selected duration
              </span>
              <span className="text-text-primary font-bold tabular-nums">
                {selectedDuration.toFixed(1)} sec
              </span>
            </div>

            {maxClipSeconds !== null && selectedDuration > maxClipSeconds && (
              <div className="text-xs text-accent-error font-mono">
                (Selection exceeds {maxClipSeconds}s guest limit)
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-surface/40 border border-border-subtle flex items-center justify-between font-mono text-xs">
            <span className="text-text-secondary uppercase tracking-widest text-[11px]">
              Total Duration
            </span>
            <div className="flex items-center gap-2">
              <span className="text-text-primary font-bold tabular-nums">
                {formatTime(duration)}
              </span>
              <StatusBadge tone={maxClipSeconds !== null ? "accent" : "default"}>
                {maxClipSeconds !== null
                  ? freeDownloadUsed
                    ? "1 Free DL Used"
                    : "1 Free DL"
                  : "Registered"}
              </StatusBadge>
            </div>
          </div>
        )}
      </div>

      {primaryTrack === "video" && (
        <div className="space-y-4">
          {/* Video Format / Codec Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-label-caps text-text-secondary uppercase tracking-widest text-[11px]">
                {mode === "clip" ? "02 // " : "01 // "}Target Format / Editor Codec
              </label>
              <span className="text-[10px] font-mono text-accent uppercase">
                {videoPreset === "prores" ? "PRORES 422 · MOV" : videoPreset === "high_quality" ? "H.265 · MP4" : videoPreset === "original" ? "DIRECT STREAM" : "H.264 + AAC · MP4"}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVideoPreset("compatible")}
                aria-pressed={videoPreset === "compatible"}
                className={presetCardClass(videoPreset === "compatible")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Editor Ready</span>
                  <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">MP4</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  H.264 + AAC · 100% NLE Compatible
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoPreset("prores")}
                aria-pressed={videoPreset === "prores"}
                className={presetCardClass(videoPreset === "prores")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">ProRes 422</span>
                  <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">MOV</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  Apple ProRes · Smooth NLE Scrubbing
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoPreset("high_quality")}
                aria-pressed={videoPreset === "high_quality"}
                className={presetCardClass(videoPreset === "high_quality")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">High Efficiency</span>
                  <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">MP4</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  H.265 / HEVC · Low File Size
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVideoPreset("original")}
                aria-pressed={videoPreset === "original"}
                className={presetCardClass(videoPreset === "original")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Direct Stream</span>
                  <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">RAW</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  No Transcode · Fastest Download
                </div>
              </button>
            </div>

            <p className="text-[11px] font-mono text-text-secondary/80 pt-1 leading-relaxed">
              {videoPreset === "compatible" && "Transcoded to standard H.264 (AVC) + AAC MP4. Works flawlessly in Premiere Pro, DaVinci Resolve, Final Cut Pro, CapCut, Sony Vegas, and all players."}
              {videoPreset === "prores" && "Apple ProRes 422 Standard in QuickTime (.mov). The editing master codec with zero CPU lag and buttery-smooth timeline scrubbing."}
              {videoPreset === "high_quality" && "HEVC / H.265 video with AAC audio. Keeps high visual fidelity at reduced file size."}
              {videoPreset === "original" && "Stream copied without re-encoding. Note: YouTube 4K streams use VP9/AV1 which some video editors cannot open directly."}
            </p>
          </div>

          {/* Resolution Selector */}
          {resolutionChoices.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-label-caps text-text-secondary uppercase tracking-widest text-[11px]">
                  Resolution
                </label>
                {selectedFormatId && (
                  <span className="text-[10px] font-mono text-accent uppercase">
                    SELECTED: {resolutionChoices.find((c) => c.formatId === selectedFormatId)?.label || (selectedFormatId === maxChoice?.formatId ? "TOP RESOLUTION (MAX)" : selectedFormatId)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {maxChoice && (
                  <button
                    type="button"
                    onClick={() => onSelectFormat(maxChoice.formatId)}
                    aria-pressed={selectedFormatId === maxChoice.formatId}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 ${
                      selectedFormatId === maxChoice.formatId
                        ? "border-accent bg-accent/20 text-accent shadow-[0_0_10px_rgba(255,51,51,0.2)]"
                        : "border-accent/40 text-accent/80 hover:border-accent hover:text-accent"
                    }`}
                  >
                    <span>★</span>
                    <span>{maxChoice.label}</span>
                  </button>
                )}
                {resolutionChoices.map((choice) => {
                  const isSelected = selectedFormatId === choice.formatId;
                  const isMax = choice.formatId === maxChoice?.formatId;
                  if (isMax && maxChoice) return null; // Already rendered MAX button
                  return (
                    <button
                      key={choice.formatId}
                      type="button"
                      onClick={() => onSelectFormat(choice.formatId)}
                      aria-pressed={isSelected}
                      className={chipClass(isSelected)}
                    >
                      {choice.label}
                    </button>
                  );
                })}
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
              <div className="max-h-56 overflow-y-auto border border-border-subtle/50 p-2">
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-label-caps text-text-secondary uppercase tracking-widest text-[11px]">
              Audio Format
            </label>
            <span className="text-[10px] font-mono text-accent uppercase">
              {audioPreset === "wav" ? "STUDIO WAV · 48KHZ" : audioPreset === "original" ? "DIRECT AUDIO STREAM" : "HIGH QUALITY MP3 · 320KBPS"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAudioPreset("mp3")}
              aria-pressed={audioPreset === "mp3"}
              className={presetCardClass(audioPreset === "mp3")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">MP3</span>
                <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">320k</span>
              </div>
              <div className="text-[10px] text-text-secondary font-mono mt-0.5">Universal Audio</div>
            </button>

            <button
              type="button"
              onClick={() => setAudioPreset("wav")}
              aria-pressed={audioPreset === "wav"}
              className={presetCardClass(audioPreset === "wav")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">WAV</span>
                <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">PCM</span>
              </div>
              <div className="text-[10px] text-text-secondary font-mono mt-0.5">Studio Lossless</div>
            </button>

            <button
              type="button"
              onClick={() => setAudioPreset("original")}
              aria-pressed={audioPreset === "original"}
              className={presetCardClass(audioPreset === "original")}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Original</span>
                <span className="text-[10px] px-1 py-0.5 bg-accent/20 text-accent font-mono">RAW</span>
              </div>
              <div className="text-[10px] text-text-secondary font-mono mt-0.5">Direct Stream</div>
            </button>
          </div>

          <p className="text-[11px] font-mono text-text-secondary/80 pt-1 leading-relaxed">
            {audioPreset === "wav"
              ? "Studio standard uncompressed 16-bit 48kHz PCM WAV audio. Ideal for video editors (Premiere, DaVinci Resolve) and digital audio workstations (Audition, Pro Tools, Audacity)."
              : audioPreset === "mp3"
              ? "Universal 320kbps MP3 audio with maximum fidelity. Compatible with all devices, video editors, and mobile players."
              : "Direct extraction of the source audio stream without re-encoding."}
          </p>
        </div>
      )}

      {/* AI Transcript status note */}
      <div className="flex items-center justify-between px-3 py-2 border border-border-subtle/30 bg-surface/30 font-mono text-xs text-text-secondary">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-accent/60" />
          AI Audio Transcript
        </span>
        <span className="text-[10px] uppercase text-text-secondary/50 font-bold">Planned for v2</span>
      </div>

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
