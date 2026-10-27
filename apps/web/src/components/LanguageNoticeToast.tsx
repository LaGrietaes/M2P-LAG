import { useEffect, useState } from 'react';
import { useTranslation } from '../lib/i18n/I18nContext';

export function LanguageNoticeToast() {
  const { language, setLanguage, detectedSource, detectedCountry, noticeDismissed, dismissNotice, t, languages } = useTranslation();
  const [visible, setVisible] = useState(false);

  // Show only if auto-detected and user hasn't dismissed yet
  const shouldShow =
    !noticeDismissed &&
    (detectedSource === 'browser' || detectedSource === 'ip');

  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        dismissNotice();
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [shouldShow, dismissNotice]);

  if (!visible) return null;

  const currentOption = languages.find((l) => l.code === language);
  const altLang = language === 'es' ? 'en' : 'es';
  const altOption = languages.find((l) => l.code === altLang);

  const sourceLabel =
    detectedSource === 'browser'
      ? t('auto_notice.via_browser')
      : detectedCountry
      ? `(IP: ${detectedCountry})`
      : t('auto_notice.via_ip');

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-14 right-4 z-40 max-w-sm sm:max-w-md bg-[#07090e]/95 backdrop-blur-md border border-accent/40 shadow-[0_4px_25px_rgba(0,0,0,0.85)] p-3 font-mono text-xs text-white animate-in slide-in-from-bottom-2 duration-300"
      style={{
        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="text-base leading-none select-none">🌐</span>
          <div className="space-y-1">
            <p className="text-gray-300 leading-tight">
              <span className="text-white font-bold">{t('auto_notice.detected')}</span>{' '}
              <span className="text-accent-bright font-bold">
                {currentOption?.flag} {currentOption?.localName}
              </span>{' '}
              <span className="text-text-secondary text-[10px]">{sourceLabel}</span>
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              {altOption && (
                <button
                  type="button"
                  onClick={() => setLanguage(altOption.code, true)}
                  className="text-[11px] text-accent-bright hover:underline font-bold cursor-pointer"
                >
                  {t('auto_notice.change')}: {altOption.flag} {altOption.localName}
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setVisible(false);
            dismissNotice();
          }}
          className="text-text-secondary hover:text-white p-1 text-sm leading-none cursor-pointer"
          aria-label={t('auto_notice.dismiss')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
