interface StatusBadgeProps {
  /** Badge tone (spec §4) */
  tone?: "default" | "accent" | "error" | "success";
  children: React.ReactNode;
}

/**
 * StatusBadge — small pill for identity/balance/status readouts.
 */
export function StatusBadge({ tone = "default", children }: StatusBadgeProps) {
  const toneClass = {
    default: "text-text-secondary border-border-subtle bg-surface",
    accent: "text-accent border-accent/40 bg-accent/10",
    error: "text-accent-error border-accent-error/40 bg-accent-error/10",
    success: "text-green-500 border-green-500/40 bg-green-500/10",
  }[tone];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase border ${toneClass}`}
    >
      {children}
    </span>
  );
}