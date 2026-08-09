/**
 * ProgressRail — persistent left-nav pipeline stepper (spec §4).
 * Source/Inspect/Configure/Extract/Deliver, matching the mockups' sidebar.
 */

type ViewState = "input" | "source" | "configure" | "extracting" | "result";

interface ProgressRailProps {
  current: ViewState;
}

const STEPS: { view: ViewState; label: string }[] = [
  { view: "input", label: "SOURCE" },
  { view: "source", label: "INSPECT" },
  { view: "configure", label: "CONFIGURE" },
  { view: "extracting", label: "EXTRACT" },
  { view: "result", label: "DELIVER" },
];

export function ProgressRail({ current }: ProgressRailProps) {
  const currentIndex = STEPS.findIndex((s) => s.view === current);

  return (
    <nav className="flex flex-col gap-1 font-mono text-xs tracking-widest uppercase">
      {STEPS.map((step, i) => {
        const isActive = step.view === current;
        const isComplete = i < currentIndex;
        return (
          <div
            key={step.view}
            className={`flex items-center gap-3 px-3 py-2 border-l-2 transition-colors ${
              isActive
                ? "text-accent border-accent bg-accent/5"
                : isComplete
                  ? "text-text-secondary border-border-subtle hover:text-text-primary"
                  : "text-text-secondary/50 border-border-subtle"
            }`}
          >
            <span className="text-[10px] opacity-60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span aria-current={isActive ? "step" : undefined}>{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}