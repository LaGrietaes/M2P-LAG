import { useMemo, useState } from "react";
import type { FormatOption } from "../../types";

interface FormatTableProps {
  formats: FormatOption[];
  selectedId: string | null;
  onSelect: (formatId: string) => void;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

// yt-dlp reports storyboard sprite sheets (mhtml thumbnail grids used for
// scrub-preview UI) as formats too. They're never a downloadable option and
// should never reach this list.
function isStoryboard(fmt: FormatOption): boolean {
  return fmt.ext === "mhtml" || fmt.format_id?.startsWith("sb") === true;
}

function isAudioOnly(fmt: FormatOption): boolean {
  const noVideo = !fmt.vcodec || fmt.vcodec === "none";
  const hasAudio = !!fmt.acodec && fmt.acodec !== "none";
  return noVideo && hasAudio;
}

const COLLAPSE_THRESHOLD = 4;

interface FormatRowProps {
  fmt: FormatOption;
  selected: boolean;
  onSelect: () => void;
  showResolution: boolean;
}

function FormatRow({ fmt, selected, onSelect, showResolution }: FormatRowProps) {
  const codec = fmt.vcodec && fmt.vcodec !== "none" ? fmt.vcodec : fmt.acodec || fmt.codec;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left font-mono text-xs transition-colors border-l-2 ${
        selected
          ? "border-accent bg-accent/10 text-text-primary"
          : "border-transparent hover:bg-surface-elevated/60 text-text-secondary"
      }`}
    >
      <span
        className={`shrink-0 w-3 h-3 rounded-full border ${
          selected ? "border-accent bg-accent" : "border-border-subtle"
        }`}
        aria-hidden="true"
      />
      {showResolution && (
        <span className="w-12 shrink-0 tabular-nums text-text-primary">
          {fmt.resolution || (fmt.height ? `${fmt.height}p` : "—")}
        </span>
      )}
      <span className="w-14 shrink-0 uppercase text-text-primary">{fmt.ext}</span>
      <span className="flex-1 truncate opacity-70">{codec || "—"}</span>
      <span className="shrink-0 tabular-nums text-right w-20">
        {formatFileSize(fmt.filesize)}
      </span>
    </button>
  );
}

interface FormatGroupProps {
  label: string;
  formats: FormatOption[];
  showResolution: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function FormatGroup({
  label,
  formats,
  showResolution,
  selectedId,
  onSelect,
}: FormatGroupProps) {
  const [expanded, setExpanded] = useState(false);
  if (formats.length === 0) return null;

  const visible = expanded ? formats : formats.slice(0, COLLAPSE_THRESHOLD);
  const remaining = formats.length - visible.length;

  return (
    <div className="space-y-1">
      <div className="px-3 flex items-baseline justify-between text-label-caps text-text-secondary uppercase tracking-widest">
        <span>{label}</span>
        <span className="opacity-60">{formats.length}</span>
      </div>
      <div className="divide-y divide-border-subtle/60">
        {visible.map((fmt, i) => (
          <FormatRow
            key={fmt.format_id || i}
            fmt={fmt}
            selected={fmt.format_id === selectedId}
            onSelect={() => onSelect(fmt.format_id)}
            showResolution={showResolution}
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-3 py-1 text-[11px] font-mono text-text-secondary hover:text-accent transition-colors"
        >
          › show {remaining} more
        </button>
      )}
    </div>
  );
}

/**
 * FormatTable — Advanced format picker (spec §4). Groups real source
 * formats into Video / Audio-only, sorted best-quality first, with
 * storyboard sprite-sheet entries filtered out entirely. Selection is
 * controlled by the parent so Standard-tab chips and Advanced-tab rows
 * share one underlying choice (spec §2 — real, source-derived formats).
 */
export function FormatTable({ formats, selectedId, onSelect }: FormatTableProps) {
  const { video, audio } = useMemo(() => {
    const real = formats.filter((f) => !isStoryboard(f));
    const video = real
      .filter((f) => !isAudioOnly(f))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0));
    const audio = real
      .filter(isAudioOnly)
      .sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0));
    return { video, audio };
  }, [formats]);

  if (video.length === 0 && audio.length === 0) {
    return (
      <p className="px-3 py-4 text-xs font-mono text-text-secondary">
        No format details available for this source.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FormatGroup
        label="Video"
        formats={video}
        showResolution
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <FormatGroup
        label="Audio only"
        formats={audio}
        showResolution={false}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
