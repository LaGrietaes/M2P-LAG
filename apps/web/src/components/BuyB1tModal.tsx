/**
 * BuyB1tModal — B1T$ credit purchase tiers (pure B1T$, no fiat display).
 */

import { useState } from "react";
import { purchaseB1t } from "../lib/api";
import { useDevMode } from "../lib/devMode";

interface BuyB1tModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased: (creditedAmount: number) => void;
}

const TIERS: { tier: number; amount: number; price: string; label: string; note: string; bonus?: string }[] = [
  { tier: 1, amount: 100, price: "€1.00", label: "SIGNAL", note: "100 B1T$ · Starter pack" },
  { tier: 2, amount: 550, price: "€5.00", label: "BROADCAST", note: "500 + 50 bonus B1T$", bonus: "+10% BONUS" },
  { tier: 3, amount: 2300, price: "€20.00", label: "OVERRIDE", note: "2000 + 300 bonus B1T$", bonus: "+15% BONUS" },
];

export function BuyB1tModal({ isOpen, onClose, onPurchased }: BuyB1tModalProps) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isDeveloper } = useDevMode();

  if (!isOpen) return null;

  const handleBuy = async (tier: number, amount: number) => {
    if (isDeveloper) return; // Dev bypass — no charge
    setPending(tier);
    setError(null);
    try {
      const result = await purchaseB1t(tier);
      if (result.b1t_credited) {
        onPurchased(result.b1t_credited);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
      void amount;
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-[#040508] border border-border-strong p-0 overflow-hidden shadow-[0_0_60px_rgba(160,0,0,0.25)]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent-bright pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <p className="font-mono text-label-caps text-text-secondary tracking-widest mb-0.5">CREDIT ACQUISITION</p>
            <h2 className="font-display font-black text-xl text-white tracking-tight">BUY B1T$</h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-secondary hover:text-white transition-colors text-lg leading-none px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Dev override banner */}
        {isDeveloper && (
          <div className="px-6 py-3 border-b border-border-subtle bg-accent/10">
            <p className="font-mono text-xs text-accent-bright font-bold tracking-wider uppercase">
              [DEV OVERRIDE ACTIVE] — All credits are unlimited at 0 B1T$
            </p>
          </div>
        )}

        {/* Tier grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border-subtle p-px mx-6 my-6">
          {TIERS.map(({ tier, amount, price, label, note, bonus }) => (
            <button
              key={tier}
              onClick={() => handleBuy(tier, amount)}
              disabled={pending !== null}
              className="glitch-text-hover group flex flex-col items-start gap-2 p-4 bg-[#040508] hover:bg-surface-elevated transition-colors disabled:opacity-50 text-left relative"
            >
              <div className="w-full flex items-center justify-between">
                <span className="font-mono text-label-caps text-text-secondary tracking-widest">{label}</span>
                {bonus && (
                  <span className="text-[9px] font-mono font-bold text-accent px-1 py-0.5 bg-accent/15 border border-accent/40">
                    {bonus}
                  </span>
                )}
              </div>
              <span className="glitch-target font-display font-black text-2xl text-white">
                {isDeveloper ? "0" : amount}
                <span className="text-sm font-mono text-accent-bright ml-1">B1T$</span>
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs font-bold text-white tracking-wide">{price}</span>
                <span className="font-mono text-[10px] text-text-secondary">{note}</span>
              </div>
              {pending === tier && (
                <span className="font-mono text-xs text-accent-bright animate-pulse">Processing…</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mb-6 p-3 text-sm font-mono text-accent-error bg-accent-error/10 border border-accent-error/40">
            {error}
          </div>
        )}

        <div className="px-6 pb-5 text-center font-mono text-[10px] text-text-secondary tracking-widest uppercase">
          100 B1T$ = approx €1.00 · Prices subject to change
        </div>
      </div>
    </div>
  );
}