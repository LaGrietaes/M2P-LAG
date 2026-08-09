/**
 * ClipEditor — IN/OUT selector with 20-second boundary (§12, §10).
 *
 * UI:
 *   +------------------------------------------------+
 *   |                 VIDEO PREVIEW                  |
 *   +------------------------------------------------+
 *   | 00:14:32              00:14:52                 |
 *   |    |----------------------|                    |
 *   |    IN                    OUT                   |
 *   | [ -5s ] [ -1s ] [ PLAY ] [ +1s ] [ +5s ]     |
 *   | Duration: 20.0 sec                             |
 *   |              [ EXTRACT CLIP ]                  |
 *   +------------------------------------------------+
 *
 * Desktop keyboard shortcuts:
 *   I → set IN, O → set OUT, Space → play/pause,
 *   Arrow Left/Right → seek, Shift+Arrow → larger seek
 *
 * For guests: 20-second boundary is shown visually and enforced.
 */

import { useState, useRef, useEffect } from "react";
import type { InspectResponse } from "../../types";

interface ClipEditorProps {
  media: InspectResponse;
  onExtract: (start: number, end: number) => void;
  isExtracting: boolean;
}

const GUEST_MAX_SECONDS = 20;

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ClipEditor({ media, onExtract, isExtracting }: ClipEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  const duration = media.duration ?? 0;
  const selectedDuration = outPoint - inPoint;

  // Keyboard shortcuts (§12 — desktop only)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      const tag = e.target instanceof HTMLElement ? e.target.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "i":
          setInPoint(videoRef.current.currentTime);
          break;
        case "o":
          setOutPoint(videoRef.current.currentTime);
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(e.shiftKey ? -10 : -5);
          break;
        case "ArrowRight":
          seekBy(e.shiftKey ? 10 : 5);
          break;
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekBy = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + seconds),
    );
  };

  const handleExtract = () => {
    if (selectedDuration <= 0) {
      setShowError("Please select a segment (set IN and OUT points).");
      return;
    }
    if (selectedDuration > GUEST_MAX_SECONDS) {
      setShowError(
        `Guest extraction limit is ${GUEST_MAX_SECONDS} seconds. ` +
          `Your selection is ${selectedDuration.toFixed(1)} seconds.`,
      );
      return;
    }
    setShowError(null);
    onExtract(inPoint, outPoint);
  };

  // Build a playable video source from formats
  const getVideoSource = (): string | null => {
    if (!media.formats || media.formats.length === 0) return null;
    // Prefer mp4 formats with both video and audio
    const mp4 = media.formats.find(
      (f) => f.ext === "mp4" && f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none",
    );
    if (mp4) return mp4.format_id;
    // Fallback: any format with video
    const video = media.formats.find((f) => f.vcodec && f.vcodec !== "none");
    return video?.format_id ?? null;
  };

  const videoSrc = getVideoSource();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      {/* Video preview (§12) */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controls={false}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <span>Preview not available for this source</span>
          </div>
        )}
      </div>

      {/* IN/OUT timeline (§12) */}
      <div className="space-y-4">
        {/* Time display */}
        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatTime(inPoint)}</span>
          <span>{formatTime(outPoint)}</span>
        </div>

        {/* Visual timeline with 20-second boundary (§10) */}
        <div className="relative h-12">
          <div className="absolute inset-0 bg-gray-800 rounded-lg h-6 mt-3"></div>

          {/* IN/OUT markers */}
          <div
            className="absolute top-3 h-6 border-2 border-red-500 rounded"
            style={{
              left: `${(inPoint / duration) * 100}%`,
              width: `${((outPoint - inPoint) / duration) * 100}%`,
              minWidth: "2px",
            }}
          >
            <div className="absolute -top-6 left-0 text-xs text-red-400">
              IN
            </div>
            <div className="absolute -top-6 right-0 text-xs text-red-400">
              OUT
            </div>
          </div>

          {/* 20-second boundary indicator (§10 — guest) */}
          {selectedDuration > 0 && selectedDuration <= GUEST_MAX_SECONDS && (
            <div
              className="absolute top-3 h-6 border border-yellow-500/50 rounded pointer-events-none"
              style={{
                left: `${(inPoint / duration) * 100}%`,
                width: `${(GUEST_MAX_SECONDS / duration) * 100}%`,
                opacity: 0.5,
              }}
            />
          )}
        </div>

        {/* Controls (§12) */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => seekBy(-5)}
            className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
          >
            -5s
          </button>
          <button
            onClick={() => seekBy(-1)}
            className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
          >
            -1s
          </button>
          <button
            onClick={togglePlay}
            className="px-4 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>
          <button
            onClick={() => seekBy(1)}
            className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
          >
            +1s
          </button>
          <button
            onClick={() => seekBy(5)}
            className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700"
          >
            +5s
          </button>
        </div>

        {/* Duration display (§12) */}
        <div className="text-center">
          <span className="text-lg font-medium text-white">
            Duration: {selectedDuration.toFixed(1)} sec
          </span>
          {selectedDuration > GUEST_MAX_SECONDS && (
            <span className="ml-2 text-sm text-red-400">
              (exceeds {GUEST_MAX_SECONDS}s guest limit)
            </span>
          )}
        </div>

        {/* Error message (§28) */}
        {showError && (
          <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
            {showError}
          </div>
        )}

        {/* Extract button (§12) */}
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
