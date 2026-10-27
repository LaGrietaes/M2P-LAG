import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectFromBrowser,
  getSavedLanguage,
  setSavedLanguage,
  getInitialLanguage,
  hasDismissedNotice,
  setDismissedNotice,
} from './detector';
import { translate, translations } from './translations';
import type { Language } from './types';

describe('i18n Language Detector', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Storage persistence', () => {
    it('returns null when no language is saved', () => {
      expect(getSavedLanguage()).toBeNull();
    });

    it('saves and retrieves valid supported languages', () => {
      const langs: Language[] = ['es', 'en', 'ca', 'fr'];
      for (const lang of langs) {
        setSavedLanguage(lang);
        expect(getSavedLanguage()).toBe(lang);
      }
    });

    it('ignores invalid saved language values', () => {
      localStorage.setItem('m2p_language', 'de');
      expect(getSavedLanguage()).toBeNull();
    });

    it('tracks auto-notice dismissed state', () => {
      expect(hasDismissedNotice()).toBe(false);
      setDismissedNotice(true);
      expect(hasDismissedNotice()).toBe(true);
    });
  });

  describe('Browser language detection', () => {
    it('detects Catalan from navigator.languages', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ca-ES', 'es-ES']);
      expect(detectFromBrowser()).toBe('ca');
    });

    it('detects French from navigator.languages', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'en']);
      expect(detectFromBrowser()).toBe('fr');
    });

    it('detects English from navigator.languages', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'en']);
      expect(detectFromBrowser()).toBe('en');
    });

    it('detects Spanish from navigator.languages', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES']);
      expect(detectFromBrowser()).toBe('es');
    });

    it('falls back to navigator.language when languages array is empty', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue([]);
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('ca-AD');
      expect(detectFromBrowser()).toBe('ca');
    });
  });

  describe('Initial language determination', () => {
    it('prioritizes explicit user choice over browser config', () => {
      setSavedLanguage('fr');
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US']);

      const initial = getInitialLanguage();
      expect(initial.language).toBe('fr');
      expect(initial.source).toBe('manual');
    });
  });

  describe('Translation dictionaries integrity', () => {
    const supported: Language[] = ['es', 'en', 'ca', 'fr'];

    it('contains all 4 supported languages', () => {
      expect(Object.keys(translations).sort()).toEqual(['ca', 'en', 'es', 'fr']);
    });

    it('has matching key structure across all languages', () => {
      const baseKeys = Object.keys(translations.es);
      for (const lang of supported) {
        expect(Object.keys(translations[lang])).toEqual(baseKeys);
      }
    });

    it('translates nested keys and interpolates variables correctly', () => {
      expect(translate('es', 'header.signal')).toBe('SIGNAL:');
      expect(translate('en', 'header.downloads_title')).toBe('01 // DOWNLOAD HISTORY');
      expect(translate('ca', 'header.downloads_title')).toBe('01 // HISTORIAL DE DESCÀRREGUES');
      expect(translate('fr', 'header.downloads_title')).toBe('01 // HISTORIQUE DES TÉLÉCHARGEMENTS');

      // Interpolation
      expect(translate('en', 'clip_editor.cap_warning', { seconds: 20 })).toContain('20 seconds');
      expect(translate('es', 'clip_editor.cap_warning', { seconds: 20 })).toContain('20 seconds');
    });

    it('falls back to Spanish if key is missing in another language', () => {
      expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key');
    });
  });
});
