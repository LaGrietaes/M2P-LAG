import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant (spec §4) */
  variant?: "primary" | "ghost" | "danger";
}

/**
 * Button — replaces .hud-button. Variants: primary (accent fill),
 * ghost (transparent + border), danger (accent-error).
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = {
    primary:
      "bg-accent text-white hover:bg-brand-red-dark border border-accent",
    ghost:
      "bg-transparent text-text-primary border border-border-subtle hover:bg-surface-elevated",
    danger:
      "bg-transparent text-accent-error border border-accent-error/50 hover:bg-accent-error/10",
  }[variant];

  return (
    <button
      className={`btn-sweep font-mono text-sm font-medium tracking-widest uppercase px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...props}
    />
  );
}