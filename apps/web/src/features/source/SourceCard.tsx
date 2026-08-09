/**
 * SourceCard — displays media metadata and format selection (§13, §H, §I).
 *
 * After URL inspection, this card shows:
 * - Thumbnail, title, creator, platform, duration, upload date, source URL
 * - Available formats (with codec/resolution info)
 * - Available subtitles
 * - Format selection: VIDEO (H.264/H.265 + resolution), AUDIO (MP3/Original),
 *   TRANSCRIPTS (SRT/VTT/TXT)
 * - Action buttons: Preview, Extract
 */

import type { InspectResponse, FormatOption } from "../../types";

interface SourceCardProps {
  media: InspectResponse;
  onExtract?: () => void;
  onPreview?: () => void;
  onDownloadSource?: () => void;
  freeDownloadBadge?: "available" | "used" | null;
}

// Detect if any format supports HEVC/H.265 (§H)
function hasHevc(formats: FormatOption[]): boolean {
  return formats.some(
    (f) =>
      f.vcodec?.toLowerCase().includes("hevc") ||
      f.vcodec?.toLowerCase().includes("h265") ||
      f.codec?.toLowerCase().includes("hevc") ||
      f.codec?.toLowerCase().includes("h265"),
  );
}

// Extract unique resolutions from formats, sorted ascending
function getResolutions(formats: FormatOption[]): string[] {
  const heights = new Set<number>();
  for (const f of formats) {
    if (f.height && f.height > 0) {
      heights.add(f.height);
    }
  }
  return Array.from(heights)
    .sort((a, b) => a - b)
    .map((h) => `${h}p`);
}

// Format duration as MM:SS or HH:MM:SS
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Format file size
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

export function SourceCard({
  media,
  onExtract,
  onPreview,
  onDownloadSource,
  freeDownloadBadge,
}: SourceCardProps) {
  const resolutions = getResolutions(media.formats);
  const hevcAvailable = hasHevc(media.formats);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      {/* Metadata (§13) */}
      <div className="flex gap-6 flex-col sm:flex-row">
        {media.thumbnail && (
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-32 h-24 object-cover rounded-lg bg-gray-800 flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="flex-1 space-y-2">
          <h2 className="text-xl font-bold text-white">{media.title}</h2>
          <div className="flex flex-wrap gap-2 text-sm text-gray-400">
            {media.creator && <span>{media.creator}</span>}
            {media.creator && media.platform && <span>•</span>}
            {media.platform && <span>{media.platform}</span>}
            {media.duration && <span>•</span>}
            {media.duration && <span>{formatDuration(media.duration)}</span>}
          </div>
          {media.upload_date && (
            <p className="text-sm text-gray-500">
              Published: {media.upload_date}
            </p>
          )}
          {media.webpage_url && (
            <a
              href={media.webpage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-300 truncate block"
            >
              {media.webpage_url}
            </a>
          )}
        </div>
      </div>

      {/* Format selection (§H, §I, §11) */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Output format</h3>

        {/* VIDEO presets (§H — HEVC/H.265 + resolution) */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="contentType"
                value="video"
                defaultChecked
                className="text-brand-red"
              />
              <span className="text-sm text-gray-300">VIDEO</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="contentType"
                value="audio"
                className="text-brand-red"
              />
              <span className="text-sm text-gray-300">AUDIO</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="contentType"
                value="transcript"
                className="text-brand-red"
              />
              <span className="text-sm text-gray-300">TRANSCRIPT</span>
            </label>
          </div>

          {/* Video codec + resolution (§H) */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="videoPreset"
                  value="compatible"
                  defaultChecked
                  className="text-brand-red"
                />
                <span className="text-sm text-gray-300">
                  Compatible (H.264)
                </span>
              </label>
              {hevcAvailable && (
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="videoPreset"
                    value="high_quality"
                    className="text-brand-red"
                  />
                  <span className="text-sm text-gray-300">
                    High Quality (H.265)
                  </span>
                </label>
              )}
            </div>

            {resolutions.length > 0 && (
              <select
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-red"
                defaultValue="720"
              >
                {resolutions.map((res) => (
                  <option key={res} value={res.replace("p", "")}>
                    {res}
                  </option>
                ))}
                <option value="max">Max available</option>
              </select>
            )}
          </div>

          {/* Audio presets (§I) */}
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="audioPreset"
                value="mp3"
                className="text-brand-red"
              />
              <span className="text-sm text-gray-300">MP3</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="audioPreset"
                value="original"
                defaultChecked
                className="text-brand-red"
              />
              <span className="text-sm text-gray-300">Original</span>
            </label>
          </div>

          {/* Transcript formats (§I) */}
          <div className="flex gap-4">
            {(["srt", "vtt", "txt"] as const).map((fmt) => (
              <label key={fmt} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="transcriptFormat"
                  value={fmt}
                  className="text-brand-red"
                />
                <span className="text-sm text-gray-300 uppercase">{fmt}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Available formats list */}
      {media.formats.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">
            Available formats ({media.formats.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {media.formats.slice(0, 10).map((fmt, i) => (
              <div
                key={fmt.format_id || i}
                className="flex justify-between items-center text-sm py-1 border-b border-gray-800"
              >
                <span className="text-gray-400">
                  {fmt.format_id || "unknown"}
                </span>
                <div className="flex gap-3 text-gray-500">
                  {fmt.resolution && <span>{fmt.resolution}</span>}
                  {fmt.ext && <span>.{fmt.ext}</span>}
                  {fmt.filesize && <span>{formatFileSize(fmt.filesize)}</span>}
                  {fmt.vcodec && <span>{fmt.vcodec}</span>}
                </div>
              </div>
            ))}
            {media.formats.length > 10 && (
              <p className="text-xs text-gray-500">
                +{media.formats.length - 10} more formats
              </p>
            )}
          </div>
        </div>
      )}

      {/* Available subtitles (§I) */}
      {media.subtitles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">
            Available subtitles ({media.subtitles.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {media.subtitles.map((sub, i) => (
              <span
                key={`${sub.language}-${sub.ext}-${i}`}
                className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-300"
              >
                {sub.language} ({sub.ext})
              </span>
            ))}
          </div>
        </div>
      )}

      {freeDownloadBadge && (
        <div
          className={`text-xs font-mono px-3 py-2 rounded border ${
            freeDownloadBadge === "available"
              ? "text-brand-red border-brand-red/40 bg-brand-red/10"
              : "text-gray-500 border-gray-800 bg-gray-900/40"
          }`}
        >
          {freeDownloadBadge === "available"
            ? "1 FREE FULL DOWNLOAD AVAILABLE"
            : "FREE DOWNLOAD USED — Register or buy B1T$ for more"}
        </div>
      )}

      {/* Actions (§13) */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onPreview}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Preview
        </button>
        <button
          onClick={onExtract}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-red rounded-lg hover:bg-brand-red-dark transition-colors"
        >
          Extract
        </button>
        {onDownloadSource && (
          <button
            onClick={onDownloadSource}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Download source
          </button>
        )}
      </div>
    </div>
  );
}
