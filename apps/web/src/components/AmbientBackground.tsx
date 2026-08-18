/**
 * AmbientBackground — Dynamic CRT-scanned backdrop.
 * Loads media thumbnail when available, applies edge-detection + scanlines + glitch pulses.
 */

interface AmbientBackgroundProps {
  thumbnailUrl?: string | null;
  stage: "input" | "source" | "configure" | "extracting" | "result";
}

export function AmbientBackground({ thumbnailUrl, stage }: AmbientBackgroundProps) {
  const hasMedia = !!(thumbnailUrl && (stage === "source" || stage === "configure" || stage === "extracting" || stage === "result"));

  return (
    <>
      {/* Stage ambient layer */}
      <div
        className={`ambient-bg-stage ${hasMedia ? "has-media" : ""}`}
        style={
          hasMedia
            ? { backgroundImage: `url(${thumbnailUrl})` }
            : undefined
        }
        aria-hidden="true"
      />

      {/* Radial vignette always on top of ambient */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(4,5,8,0.75) 65%, rgba(4,5,8,0.97) 100%)",
        }}
        aria-hidden="true"
      />

      {/* CRT scanlines */}
      <div className="crt-scanlines" aria-hidden="true" />
    </>
  );
}
