import { es } from './es';
import { en } from './en';
import { ca } from './ca';
import { fr } from './fr';
import type { Language } from '../types';

export const translations = {
  es,
  en,
  ca,
  fr,
} as const;

export type TranslationSchema = typeof es;

/**
 * Safely access a nested translation key using dot notation (e.g. "header.signal")
 * and interpolate optional variables like {seconds}.
 */
export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.es;
  const parts = key.split('.');

  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  // Fallback to Spanish if key is missing in target language
  if (current === undefined && lang !== 'es') {
    let fallback: any = translations.es;
    for (const part of parts) {
      if (fallback && typeof fallback === 'object' && part in fallback) {
        fallback = fallback[part];
      } else {
        fallback = undefined;
        break;
      }
    }
    current = fallback;
  }

  if (typeof current !== 'string') {
    return key;
  }

  if (params) {
    return Object.entries(params).reduce((acc, [paramKey, paramVal]) => {
      return acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }, current);
  }

  return current;
}
