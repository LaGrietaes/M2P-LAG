/**
 * LaGrietaFooter — persistent legal footer and federated consent manager for M2P.
 * Links to canonical single source of truth at lagrieta.es/legal/*
 */
import { useState, useEffect } from 'react';

const CANONICAL_LEGAL_URLS = {
  BASE: 'https://lagrieta.es',
  AVISO_LEGAL: 'https://lagrieta.es/legal/aviso-legal',
  PRIVACIDAD: 'https://lagrieta.es/legal/privacidad',
  TERMINOS: 'https://lagrieta.es/legal/terminos',
  COOKIES: 'https://lagrieta.es/legal/cookies',
};

const CONSENT_COOKIE_NAME = 'lagrieta_consent';
const CONSENT_COOKIE_MAX_AGE = 31536000; // 1 year

function getFederatedCookieDomain(hostname?: string): string | undefined {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!host) return undefined;
  if (host === 'lagrieta.es' || host.endsWith('.lagrieta.es')) {
    return '.lagrieta.es';
  }
  return undefined;
}

function parseConsentCookie(): { analytics: boolean; functional: boolean } | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`));
  if (!matches || !matches[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(matches[1]));
    if (parsed && typeof parsed === 'object') {
      return {
        analytics: Boolean(parsed.analytics),
        functional: Boolean(parsed.functional),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function writeFederatedConsent(preferences: { analytics: boolean; functional: boolean }) {
  if (typeof document === 'undefined') return;
  const state = {
    analytics: preferences.analytics,
    functional: preferences.functional,
    necessary: true,
    timestamp: Date.now(),
    version: '1.0',
  };
  const json = JSON.stringify(state);
  const domain = getFederatedCookieDomain();
  let cookieStr = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(json)}; Path=/; SameSite=Lax; Max-Age=${CONSENT_COOKIE_MAX_AGE}`;
  if (domain) {
    cookieStr += `; Domain=${domain}`;
  }
  document.cookie = cookieStr;

  try {
    localStorage.setItem(CONSENT_COOKIE_NAME, json);
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lagrieta:consent_updated', { detail: state }));
  }
}

export function LaGrietaFooter() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = parseConsentCookie();
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    writeFederatedConsent({ analytics: true, functional: true });
    setShowBanner(false);
  };

  const handleRejectOptional = () => {
    writeFederatedConsent({ analytics: false, functional: false });
    setShowBanner(false);
  };

  return (
    <>
      <footer
        role="contentinfo"
        aria-label="Información legal y cumplimiento"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-[#040508]/90 border border-white/10 backdrop-blur-md font-mono text-[10px] text-gray-400 tracking-[0.15em] uppercase hover:border-white/20 transition-all shadow-xl max-w-[95vw]"
      >
        <a
          href={CANONICAL_LEGAL_URLS.BASE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by LaGrieta.es"
          className="flex items-center gap-1.5 text-white font-bold hover:text-red-500 transition-colors"
        >
          {/* LaGrieta signal mark */}
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
            <polygon points="12,2 22,20 2,20" fill="#ff0033" />
            <polygon points="12,7 18,17 6,17" fill="#040508" />
            <line x1="12" y1="9" x2="12" y2="14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="square" />
            <rect x="11.2" y="15.2" width="1.6" height="1.6" fill="#ffffff" />
          </svg>
          <span>LAGRIETA.ES</span>
        </a>

        <span className="text-white/20 hidden sm:inline">|</span>

        <div className="flex items-center gap-2.5 text-[9px] sm:text-[10px]">
          <a href={CANONICAL_LEGAL_URLS.AVISO_LEGAL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Aviso Legal</a>
          <a href={CANONICAL_LEGAL_URLS.PRIVACIDAD} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacidad</a>
          <a href={CANONICAL_LEGAL_URLS.TERMINOS} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Términos</a>
          <a href={CANONICAL_LEGAL_URLS.COOKIES} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cookies</a>
          <button
            type="button"
            onClick={() => setShowBanner(true)}
            className="hover:text-red-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-mono text-[9px] sm:text-[10px] text-gray-500"
          >
            [Ajustes]
          </button>
        </div>
      </footer>

      {showBanner && (
        <div
          role="dialog"
          aria-label="Consentimiento de Cookies y Privacidad"
          className="fixed bottom-14 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="bg-[#08090d]/95 border border-red-500/40 p-4 shadow-[0_0_30px_rgba(0,0,0,0.95)] backdrop-blur-md text-gray-200 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 animate-pulse"></span>
                <span className="text-[11px] font-bold text-white tracking-widest uppercase">
                  CONSENT_FEDERATION // M2P
                </span>
              </div>
              <span className="text-[10px] text-gray-500">GDPR / LSSI-CE</span>
            </div>

            <p className="text-gray-400 text-[11px] leading-relaxed mb-3">
              M2P procesa streams multimedia y utiliza analítica agregada con{' '}
              <strong className="text-white">Plausible</strong>. Tu elección se federará en todo{' '}
              <span className="text-red-400 font-bold">*.lagrieta.es</span>.
            </p>

            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] tracking-wider uppercase transition-colors cursor-pointer"
              >
                Aceptar Todas
              </button>
              <button
                type="button"
                onClick={handleRejectOptional}
                className="flex-1 py-1.5 px-3 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-[10px] tracking-wider uppercase transition-colors cursor-pointer border border-white/10"
              >
                Solo Necesarias
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1.5 border-t border-white/5">
              <span>Single Source of Truth</span>
              <div className="flex gap-2">
                <a href={CANONICAL_LEGAL_URLS.COOKIES} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Cookies</a>
                <a href={CANONICAL_LEGAL_URLS.PRIVACIDAD} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacidad</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
