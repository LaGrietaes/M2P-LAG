/**
 * ClipEditor — IN/OUT selector with quota-driven duration cap (§12, spec §2).
 *
 * Numeric MM:SS inputs for IN/OUT replace scrub-bar video preview, since the
 * previous implementation set <video src={format_id}> to a bare yt-dlp
 * format ID rather than a playable URL (spec §2 bug fix).
 *
 * maxClipSeconds is quota-driven: null means unlimited (registered users,
 * spec §3), a number means the boundary is shown and enforced (guests).
 */

import { useState } from "react";
import type { InspectResponse } from "../../types";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (start: number, end: number) => void;
  isExtracting: boolean;
  maxClipSeconds: number | null;
}

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Parse "MM:SS" into seconds; returns null if invalid
function parseTime(value: string): number | null {
  const match = value.match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes * 60 + seconds;
}

export function ClipEditor({
  media,
  onExtract,
  isExtracting,
  maxClipSeconds,
}: ClipEditorProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inText, setInText] = useState(formatTime(0));
  const [outText, setOutText] = useState(formatTime(0));
  const [showError, setShowError] = useState<string | null>(null);

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

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      {/* Thumbnail (video scrubbing removed — spec §2 bug fix) */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        {media.thumbnail ? (
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span>Preview not available for this source</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* IN/OUT numeric inputs */}
        <div className="flex justify-center gap-6">
          <label className="flex flex-col items-center gap-1 text-sm text-gray-400">
            IN point
            <input
              aria-label="In point"
              type="text"
              value={inText}
              onChange={(e) => handleInChange(e.target.value)}
              placeholder="00:00"
              className="w-24 px-2 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500"
            />
          </label>
          <label className="flex flex-col items-center gap-1 text-sm text-gray-400">
            OUT point
            <input
              aria-label="Out point"
              type="text"
              value={outText}
              onChange={(e) => handleOutChange(e.target.value)}
              placeholder="00:00"
              className="w-24 px-2 py-1 text-center bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500"
            />
          </label>
        </div>

        {/* Visual timeline */}
        {duration > 0 && (
          <div className="relative h-12">
            <div className="absolute inset-0 bg-gray-800 rounded-lg h-6 mt-3"></div>
            <div
              className="absolute top-3 h-6 border-2 border-red-500 rounded"
              style={{
                left: `${(inPoint / duration) * 100}%`,
                width: `${Math.max(((outPoint - inPoint) / duration) * 100, 0)}%`,
                minWidth: "2px",
              }}
            />
            {maxClipSeconds !== null && (
              <div
                className="absolute top-3 h-6 border border-yellow-500/50 rounded pointer-events-none"
                style={{
                  left: `${(inPoint / duration) * 100}%`,
                  width: `${(maxClipSeconds / duration) * 100}%`,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        )}

        {/* Duration display */}
        <div className="text-center">
          <span className="text-lg font-medium text-white">
            Duration: {selectedDuration.toFixed(1)} sec
          </span>
          {maxClipSeconds !== null && selectedDuration > maxClipSeconds && (
            <span className="ml-2 text-sm text-red-400">
              (exceeds {maxClipSeconds}s guest limit)
            </span>
          )}
        </div>

        {showError && (
          <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
            {showError}
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={handleExtract}
            disabled={isExtracting || selectedDuration <= 0}
            className="px-6 py-3 text-lg font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isExtracting ? "Extracting…" : "EXTRACT CLIP"}
          </button>
        </div>
      </div>
    </div>
  );
}
