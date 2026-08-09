import type { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Glass panel variant (spec §4) */
  variant?: "default" | "active" | "bordered";
}

/**
 * Panel — glass panel primitive. Replaces .hud-panel.
 * Variants: default (glass), active (elevated glass), bordered (accent border).
 */
export function Panel({
  variant = "default",
  className = "",
  ...props
}: PanelProps) {
  const variantClass = {
    default: "glass-panel",
    active: "glass-panel-active",
    bordered: "glass-panel border-accent/40",
  }[variant];

  return <div className={`${variantClass} ${className}`} {...props} />;
}