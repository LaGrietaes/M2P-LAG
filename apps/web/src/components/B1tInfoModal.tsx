/**
 * B1tInfoModal — Tactical explanation modal for the B1T$ credit ecosystem in La Grieta & M2P.
 */

import { useTranslation } from "../lib/i18n/I18nContext";

interface B1tInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export function B1tInfoModal({ isOpen, onClose, onOpenLogin }: B1tInfoModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Información sobre créditos B1T$"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#040508] border border-border-strong p-0 overflow-hidden shadow-[0_0_60px_rgba(160,0,0,0.35)]">
        {/* Tactical corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent-bright pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent-bright pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface/60">
          <div>
            <p className="font-mono text-label-caps text-accent-bright tracking-widest mb-0.5">
              {t('b1t_modal.protocol_tag')}
            </p>
            <h2 className="font-display font-black text-xl text-white tracking-tight flex items-center gap-2">
              <span>{t('b1t_modal.title')}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-accent/20 border border-accent/40 text-accent-bright font-bold">
                {t('b1t_modal.no_fiat')}
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-secondary hover:text-white transition-colors text-lg leading-none px-2 py-1 cursor-pointer"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
          {/* Summary highlight */}
          <div className="p-3.5 bg-accent/10 border-l-2 border-accent text-gray-200 leading-relaxed">
            {t('b1t_modal.highlight')}
          </div>

          {/* Section: How to earn */}
          <div className="space-y-1.5 border border-border-subtle p-3.5 bg-[#080b11]">
            <div className="flex items-center gap-2 text-white font-bold text-label-caps tracking-wider">
              <span className="w-1.5 h-1.5 bg-accent-bright" />
              <span>{t('b1t_modal.how_to_earn')}</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              Leyendo, participando, compartiendo y completando retos dentro de la plataforma principal en{" "}
              <a
                href="https://lagrieta.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-bright hover:underline font-bold"
              >
                LaGrieta.es
              </a>
              . El sistema premia la actividad orgánica de los operadores.
            </p>
          </div>

          {/* Section: Consumption rates */}
          <div className="space-y-2 border border-border-subtle p-3.5 bg-[#080b11]">
            <div className="flex items-center gap-2 text-white font-bold text-label-caps tracking-wider">
              <span className="w-1.5 h-1.5 bg-accent-bright" />
              <span>CONSUMO EN M2P</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 bg-black/50 border border-border-subtle">
                <span className="text-text-secondary block">CLIPS / RECORTES</span>
                <strong className="text-white text-xs">1 B1T$ / minuto</strong>
              </div>
              <div className="p-2 bg-black/50 border border-border-subtle">
                <span className="text-text-secondary block">DESCARGA COMPLETA</span>
                <strong className="text-white text-xs">~1 B1T$ / 50 MB</strong>
              </div>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed pt-1">
              Como invitado (Guest) tienes 20 segundos por clip y 1 descarga completa gratuita de cortesía.
            </p>
          </div>

          {/* Section: Member sync */}
          <div className="space-y-1.5 border border-border-subtle p-3.5 bg-[#080b11]">
            <div className="flex items-center gap-2 text-white font-bold text-label-caps tracking-wider">
              <span className="w-1.5 h-1.5 bg-[#10b981]" />
              <span>MIEMBROS DE LAGRIETA.ES</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              Si ya perteneces a La Grieta, inicia sesión con tu correo electrónico de miembro. Tu saldo de
              B1T$ se sincronizará automáticamente para habilitar extracciones sin límite de tiempo.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-border-subtle bg-surface/40">
          <a
            href="https://lagrieta.es/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-text-secondary hover:text-white transition-colors underline"
          >
            Visitar LaGrieta.es →
          </a>

          <div className="flex items-center gap-2">
            {onOpenLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="px-3.5 py-1.5 text-xs font-mono font-bold tracking-wider uppercase text-white bg-accent hover:bg-accent-bright transition-colors cursor-pointer border border-accent-bright"
              >
                Entrar con La Grieta
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono tracking-wider uppercase text-text-secondary hover:text-white border border-border-subtle hover:border-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
