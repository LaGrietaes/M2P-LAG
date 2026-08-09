/**
 * ProgressRail — 4-step HUD indicator matching the product pipeline
 * (SOURCE → INSPECT → EXTRACT → DELIVER, spec §5, README.md tagline).
 */

type ViewState = "input" | "source" | "extractor" | "result";

interface ProgressRailProps {
  current: ViewState;
}

const STEPS: { view: ViewState; label: string }[] = [
  { view: "input", label: "SOURCE" },
  { view: "source", label: "INSPECT" },
  { view: "extractor", label: "EXTRACT" },
  { view: "result", label: "DELIVER" },
];

export function ProgressRail({ current }: ProgressRailProps) {
  const currentIndex = STEPS.findIndex((s) => s.view === current);

  return (
    <div className="flex items-center gap-2 text-xs font-mono tracking-widest">
      {STEPS.map((step, i) => {
        const isActive = step.view === current;
        const isComplete = i < currentIndex;
        return (
          <div key={step.view} className="flex items-center gap-2">
            <span
              aria-current={isActive ? "step" : undefined}
              className={
                isActive
                  ? "text-red-400 font-bold"
                  : isComplete
                    ? "text-gray-400"
                    : "text-gray-700"
              }
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-gray-800">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
