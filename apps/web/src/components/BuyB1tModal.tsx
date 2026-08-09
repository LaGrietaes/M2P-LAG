/**
 * BuyB1tModal — package-tier B1T$ purchase entry point (spec §4).
 * Restyled onto the new glass/panel language (spec §4).
 */

import { useState } from "react";
import { purchaseB1t } from "../lib/api";
import { Panel } from "./ui/Panel";

interface BuyB1tModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchased: (creditedAmount: number) => void;
}

const TIERS: { tier: number; amount: number }[] = [
  { tier: 1, amount: 100 },
  { tier: 2, amount: 500 },
  { tier: 3, amount: 1000 },
];

export function BuyB1tModal({ isOpen, onClose, onPurchased }: BuyB1tModalProps) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = async (tier: number, amount: number) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <Panel variant="active" className="p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Buy B1T$</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TIERS.map(({ tier, amount }) => (
            <button
              key={tier}
              onClick={() => handleBuy(tier, amount)}
              disabled={pending !== null}
              className="flex flex-col items-center gap-1 p-4 bg-surface border border-border-subtle hover:border-accent disabled:opacity-50 transition-colors"
            >
              <span className="text-lg font-bold text-text-primary">{amount} B1T$</span>
              {pending === tier && (
                <span className="text-xs text-text-secondary">Processing…</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 text-sm text-accent-error bg-accent-error/10 border border-accent-error/40">
            {error}
          </div>
        )}
      </Panel>
    </div>
  );
}