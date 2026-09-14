type ViewState = "input" | "source" | "configure" | "extracting" | "result";

interface ProgressRailProps {
  current: ViewState;
  onStepClick?: (view: ViewState) => void;
  orientation?: "horizontal" | "vertical";
}

const STEPS: { view: ViewState; label: string }[] = [
  { view: "input", label: "ENTER URL" },
  { view: "source", label: "PREVIEW" },
  { view: "configure", label: "OPTIONS" },
  { view: "extracting", label: "PROCESSING" },
  { view: "result", label: "DOWNLOAD" },
];

export function ProgressRail({
  current,
  onStepClick,
  orientation = "horizontal",
}: ProgressRailProps) {
  const currentIndex = STEPS.findIndex((s) => s.view === current);

  if (orientation === "vertical") {
    return (
      <nav className="flex flex-col gap-1 font-mono text-xs tracking-widest uppercase">
        {STEPS.map((step, i) => {
          const isActive = step.view === current;
          const isComplete = i < currentIndex;
          return (
            <div
              key={step.view}
              onClick={() => onStepClick?.(step.view)}
              className={`flex items-center gap-3 px-3 py-2 border-l-2 transition-colors cursor-pointer ${
                isActive
                  ? "text-white border-accent-bright bg-accent/20"
                  : isComplete
                  ? "text-text-secondary border-border-subtle hover:text-white"
                  : "text-text-secondary/50 border-border-subtle"
              }`}
            >
              <span className="text-[10px] text-accent-bright font-bold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span aria-current={isActive ? "step" : undefined}>{step.label}</span>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex w-full bg-white/5 border border-border-subtle font-mono text-xs tracking-widest uppercase">
      {STEPS.map((step, i) => {
        const isActive = step.view === current;
        const isComplete = i < currentIndex;
        return (
          <button
            key={step.view}
            type="button"
            onClick={() => onStepClick?.(step.view)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 transition-colors border-b-2 ${
              isActive
                ? "bg-accent/25 text-white border-accent-bright"
                : isComplete
                ? "bg-[#040508] text-text-secondary hover:text-white border-transparent"
                : "bg-[#040508] text-text-secondary/50 border-transparent"
            }`}
          >
            <span className={isActive ? "text-accent-bright font-bold" : "opacity-60"}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span aria-current={isActive ? "step" : undefined} className="hidden sm:inline">
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}