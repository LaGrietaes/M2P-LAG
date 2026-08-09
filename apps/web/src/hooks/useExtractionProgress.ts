import { useState, useEffect, useRef } from "react";

/**
 * useExtractionProgress — interim indeterminate-progress contract (spec §5).
 *
 * While the extract/download request is in flight, the pixel-grid fill eases
 * toward ~90% on a fixed timer curve, then jumps to 100% when the request
 * resolves. This is NOT presented as a real percentage from the server; it's
 * a deliberately-designed indeterminate state. A future real-progress backend
 * swaps in here without touching the visual component.
 */
const EASE_TARGET = 90;
const EASE_HALF_LIFE_MS = 2500;

function easedProgress(elapsedMs: number): number {
  // Exponential approach to EASE_TARGET — starts fast, slows near the target.
  return EASE_TARGET * (1 - Math.pow(0.5, elapsedMs / EASE_HALF_LIFE_MS));
}

export function useExtractionProgress(isPending: boolean) {
  const [progress, setProgress] = useState(0);
  const prevPending = useRef(isPending);
  // Real value assigned in the effect below on the first idle->pending
  // transition; 0 here is never read before that happens.
  const startedAtRef = useRef(0);

  useEffect(() => {
    // Only reset on an idle->pending transition, not on every effect run —
    // an unconditional setState here would fight React's render cycle.
    if (isPending && !prevPending.current) {
      startedAtRef.current = Date.now();
      setProgress(0);
    }
    prevPending.current = isPending;

    if (!isPending) {
      return;
    }

    const interval = setInterval(() => {
      setProgress(easedProgress(Date.now() - startedAtRef.current));
    }, 300);

    return () => clearInterval(interval);
  }, [isPending]);

  // When not pending, jump to 100% (request resolved)
  return isPending ? progress : 100;
}
