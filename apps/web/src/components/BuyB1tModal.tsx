/**
 * BuyB1tModal — package-tier B1T$ purchase entry point (spec §4).
 *
 * Backend is stubbed: returns 501 in production config, credits balance
 * only when M2P_DEV_CREDIT_GRANTS is set server-side.
 */

import { useState } from "react";
import { purchaseB1t } from "../lib/api";

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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Buy B1T$</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
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
              className="flex flex-col items-center gap-1 p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-red-500 disabled:opacity-50 transition-colors"
            >
              <span className="text-lg font-bold text-white">{amount} B1T$</span>
              {pending === tier && (
                <span className="text-xs text-gray-400">Processing…</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
