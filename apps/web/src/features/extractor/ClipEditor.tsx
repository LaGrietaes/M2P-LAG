/**
 * ClipEditor — "Extraction Controller" panel (spec §5).
 * Right column of the Configure screen: mode/content-type switches, format
 * selection (resolution/preset for video, codec for audio, format for
 * transcript), and time-range control. Single consolidated panel — the left
 * SourceCard column is preview/metadata/actions only.
 */

import { useMemo, useState } from "react";
import type { FormatOption, InspectResponse } from "../../types";
import { Panel } from "../../components/ui/Panel";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormatTable } from "../../components/ui/FormatTable";

// Primary track and "include transcript" are independent axes, not one
// exclusive switch — this is what makes VIDEO+TRANSCRIPT and AUDIO+
// TRANSCRIPT selectable at the same time, per the brief's combinations.
type PrimaryTrack = "video" | "audio";
type Mode = "clip" | "full";
type VideoPreset = "compatible" | "high_quality";
type AudioPreset = "mp3" | "original";
type TranscriptFormat = "srt" | "vtt" | "txt";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (start: number, end: number) => void;
  isExtracting: boolean;
  maxClipSeconds: number | null;
  selectedFormatId: string | null;
  onSelectFormat: (formatId: string | null) => void;
  b1tBalance: number | null;
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

// One representative format per resolution, sorted ascending, plus a MAX
// choice pointing at the single highest-resolution real format. Picking the
// best-bitrate format at a given height keeps the Standard tab's chips
// mapped to a real, concrete format_id (spec §2), not just a display label.
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
}: ClipEditorProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inText, setInText] = useState(formatTime(0));
  const [outText, setOutText] = useState(formatTime(0));
  const [showError, setShowError] = useState<string | null>(null);
  const [primaryTrack, setPrimaryTrack] = useState<PrimaryTrack>("video");
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [mode, setMode] = useState<Mode>("clip");
  const [videoPreset, setVideoPreset] = useState<VideoPreset>("compatible");
  const [audioPreset, setAudioPreset] = useState<AudioPreset>("mp3");
  const [transcriptFormat, setTranscriptFormat] =
    useState<TranscriptFormat>("srt");
  const [formatTab, setFormatTab] = useState<"standard" | "advanced">(
    "standard",
  );

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
    if (mode === "full") {
      setShowError(null);
      onExtract(0, duration);
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
    onExtract(inPoint, outPoint);
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

  return (
    <Panel variant="active" className="p-6 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full pointer-events-none"></div>

      {/* Header / Identity Status */}
      <div className="flex justify-between items-start border-b border-border-subtle pb-4">
        <div>
          <h3 className="font-mono text-label-caps text-text-secondary uppercase tracking-widest mb-1">
            Extraction Controller
          </h3>
          <div className="font-bold text-accent tracking-tighter">
            {mode === "clip" ? "RANGE SET" : "FULL SOURCE"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-label-caps text-text-secondary uppercase tracking-widest mb-1">
            Identity Status
          </div>
          <div className="font-mono text-sm text-text-primary">
            BALANCE:{" "}
            <span className="tabular-nums">
              {b1tBalance !== null ? b1tBalance : "—"}
            </span>{" "}
            B1T$
          </div>
        </div>
      </div>

      {/* Top-level switches */}
      <div className="space-y-4">
        <div className="flex gap-1">
          <button onClick={() => setMode("clip")} className={switchClass(mode === "clip")}>
            Clip
          </button>
          <button onClick={() => setMode("full")} className={switchClass(mode === "full")}>
            Full Source
          </button>
        </div>
        {/* Primary track and "include transcript" are independent — this is
            what makes VIDEO+TRANSCRIPT / AUDIO+TRANSCRIPT selectable. */}
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
        <button
          onClick={() => setIncludeTranscript((v) => !v)}
          aria-pressed={includeTranscript}
          className={`w-full px-3 py-2 text-xs font-mono font-bold tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 ${
            includeTranscript
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-subtle text-text-secondary hover:text-text-primary"
          }`}
        >
          <span
            className={`w-3 h-3 border ${
              includeTranscript
                ? "bg-accent border-accent"
                : "border-text-secondary"
            }`}
            aria-hidden="true"
          />
          + Include transcript
        </button>
      </div>

      {/* Content-type-specific format selection (spec §2 — moved here from
          SourceCard so all extraction decisions live in one panel) */}
      {primaryTrack === "video" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-label-caps text-text-secondary uppercase tracking-widest">
              Video preset
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
            Audio-only extraction isn&apos;t available yet — EXTRACT currently
            produces the video file above.
          </p>
        </div>
      )}

      {/* Independent of primaryTrack — this is the VIDEO+TRANSCRIPT /
          AUDIO+TRANSCRIPT combination. */}
      {includeTranscript && (
        <div className="space-y-2 border-t border-border-subtle pt-4">
          <label className="text-label-caps text-text-secondary uppercase tracking-widest">
            Transcript format
          </label>
          <div className="flex gap-1">
            {(["srt", "vtt", "txt"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setTranscriptFormat(fmt)}
                aria-pressed={transcriptFormat === fmt}
                className={`px-3 py-1.5 text-xs font-mono border uppercase transition-colors ${
                  transcriptFormat === fmt
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-subtle hover:border-accent hover:text-accent"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-mono text-text-secondary/70 pt-1">
            Transcript generation isn&apos;t available yet — EXTRACT
            currently produces just the {primaryTrack} file above, without a
            transcript.
          </p>
        </div>
      )}

      {/* Time-range controller (clip mode only) */}
      {mode === "clip" ? (
        <div className="space-y-4 font-mono">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-label-caps text-text-secondary uppercase">
              <span>IN_MARK</span>
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
              <span>OUT_MARK</span>
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

          <div className="flex justify-between items-center py-3 border-t border-b border-border-subtle">
            <span className="text-label-caps text-text-secondary uppercase tracking-widest">
              Total duration
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
              Entire source
            </span>
            <span className="text-text-primary font-mono tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          <StatusBadge tone={maxClipSeconds !== null ? "accent" : "default"}>
            {maxClipSeconds !== null
              ? "Guest: 1 free full download"
              : "Registered: B1T$-gated"}
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
          className="w-full py-4 text-lg"
        >
          {isExtracting
            ? "Extracting…"
            : mode === "clip"
              ? "EXTRACT CLIP"
              : "DOWNLOAD SOURCE"}
        </Button>
      </div>
    </Panel>
  );
}
