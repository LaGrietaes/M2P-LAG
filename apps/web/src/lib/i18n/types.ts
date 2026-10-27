export type Language = 'es' | 'en' | 'ca' | 'fr';

export type DetectionSource = 'manual' | 'browser' | 'ip' | 'default';

export interface DetectionResult {
  language: Language;
  source: DetectionSource;
  country?: string | null;
}

export interface LanguageOption {
  code: Language;
  name: string;
  localName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish', localName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', localName: 'English', flag: '🇬🇧' },
  { code: 'ca', name: 'Catalan', localName: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  { code: 'fr', name: 'French', localName: 'Français', flag: '🇫🇷' },
];
