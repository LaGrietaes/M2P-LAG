import { Logo } from "./Logo";
import { useDevMode } from "../lib/devMode";
import type { QuotaResponse } from "../types";

interface HeaderHUDProps {
  quota: QuotaResponse | null;
  onOpenBuyModal: () => void;
}

export function HeaderHUD({ quota, onOpenBuyModal }: HeaderHUDProps) {
  const { isDeveloper, isRegistered } = useDevMode();

  const roleText = isDeveloper
    ? "DEVELOPER [UNLIMITED]"
    : isRegistered
    ? "REGISTERED"
    : quota?.role === "registered"
    ? "REGISTERED"
    : "GUEST";

  const balanceText = isDeveloper
    ? "∞ B1T$ [OVERRIDE]"
    : quota?.b1t_balance !== undefined && quota?.b1t_balance !== null
    ? `${quota.b1t_balance} B1T$`
    : "1 FREE DL";

  return (
    <header className="relative z-10 border-b border-border-subtle bg-[#040508]/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Brand Group */}
      <div className="flex items-center gap-3">
        <Logo className="w-7 h-7" />
        <span className="font-display font-black text-xl tracking-tight text-white">
          M2P
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.15em] text-text-secondary uppercase border-l border-border-subtle pl-3">
          MEDIA 2 PEER // TACTICAL
        </span>
      </div>

      {/* Right HUD Status */}
      <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span>SIGNAL:</span>
          <span className="text-[#10b981] font-bold">LOCKED</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span className="hidden sm:inline">IDENTITY:</span>
          <strong className={isDeveloper ? "text-accent-bright font-bold" : "text-white"}>
            {roleText}
          </strong>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary">
          <span className="hidden sm:inline">BALANCE:</span>
          <strong className="text-accent-bright font-extrabold">{balanceText}</strong>
        </div>

        {/* Log In Link for Guests */}
        {!isDeveloper && !isRegistered && quota?.role !== "registered" && quota?.role !== "user" && (
          <a
            href="https://beta.lagrieta.es/#/portal/signin"
            className="px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-white/5 border border-border-subtle hover:border-accent hover:text-accent transition-colors"
          >
            LOG IN
          </a>
        )}

        <button
          onClick={onOpenBuyModal}
          className="glitch-text-hover relative px-4 py-1.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-accent border border-accent-bright shadow-[0_0_12px_rgba(160,0,0,0.4)] hover:bg-accent-bright transition-colors"
        >
          <span className="glitch-target">
            {isDeveloper ? "BUY B1T$ (0 B1T$)" : "BUY B1T$"}
          </span>
        </button>
      </div>
    </header>
  );
}
