import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Language, DetectionSource, LanguageOption } from './types';
import { SUPPORTED_LANGUAGES } from './types';
import {
  getInitialLanguage,
  setSavedLanguage,
  detectFromIp,
  hasDismissedNotice,
  setDismissedNotice,
} from './detector';
import { translate } from './translations';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language, isManual?: boolean) => void;
  detectedSource: DetectionSource;
  detectedCountry: string | null;
  noticeDismissed: boolean;
  dismissNotice: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [initResult] = useState(() => getInitialLanguage());
  const [language, setLanguageState] = useState<Language>(initResult.language);
  const [detectedSource, setDetectedSource] = useState<DetectionSource>(initResult.source);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState<boolean>(() => hasDismissedNotice());

  // Update HTML lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Asynchronous non-blocking IP detection when no manual choice has been set
  useEffect(() => {
    if (detectedSource === 'manual') return;

    // Vitest/test environment bypass
    const isTest =
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test') ||
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test');
    if (isTest) return;

    let isMounted = true;
    detectFromIp().then((res) => {
      if (!isMounted || !res) return;
      setDetectedCountry(res.country);

      // If initial was just the default fallback or if IP indicates a clear regional match
      if (detectedSource === 'default') {
        setLanguageState(res.language);
        setDetectedSource('ip');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [detectedSource]);

  const setLanguage = useCallback((newLang: Language, isManual = true) => {
    setLanguageState(newLang);
    if (isManual) {
      setSavedLanguage(newLang);
      setDetectedSource('manual');
      setDismissedNotice(true);
      setNoticeDismissed(true);
    }
  }, []);

  const dismissNotice = useCallback(() => {
    setDismissedNotice(true);
    setNoticeDismissed(true);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      detectedSource,
      detectedCountry,
      noticeDismissed,
      dismissNotice,
      t,
      languages: SUPPORTED_LANGUAGES,
    }),
    [language, setLanguage, detectedSource, detectedCountry, noticeDismissed, dismissNotice, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Provide a safe fallback if used outside provider (e.g. isolated test)
    return {
      language: 'es' as Language,
      setLanguage: () => {},
      detectedSource: 'default' as DetectionSource,
      detectedCountry: null,
      noticeDismissed: true,
      dismissNotice: () => {},
      t: (key: string, params?: Record<string, string | number>) => translate('es', key, params),
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return ctx;
}
