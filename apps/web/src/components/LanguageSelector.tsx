import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../lib/i18n/I18nContext';
import type { Language } from '../lib/i18n/types';
import { ChevronDownIcon } from './ui/Icons';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'hud' | 'compact' | 'footer';
}

export function LanguageSelector({ className = '', variant = 'hud' }: LanguageSelectorProps) {
  const { language, setLanguage, languages, detectedSource } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    setLanguage(code, true);
    setIsOpen(false);
  };

  if (variant === 'footer') {
    return (
      <div className={`flex items-center gap-1.5 font-mono text-[11px] ${className}`}>
        {languages.map((item, idx) => {
          const isActive = item.code === language;
          return (
            <span key={item.code} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSelect(item.code)}
                aria-label={item.name}
                className={`transition-colors cursor-pointer px-1 py-0.5 ${
                  isActive
                    ? 'text-accent-bright font-bold border-b border-accent-bright'
                    : 'text-text-secondary hover:text-white'
                }`}
                title={item.name}
              >
                <span className="mr-1">{item.flag}</span>
                <span>{item.code.toUpperCase()}</span>
              </button>
              {idx < languages.length - 1 && <span className="text-white/20">/</span>}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen ? true : undefined}
        aria-label="Select language"
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5
          bg-surface/80 hover:bg-[#0c1017]
          border ${isOpen ? 'border-accent-bright text-white' : 'border-border-subtle text-text-secondary hover:text-white'}
          transition-colors text-xs font-mono tracking-wider cursor-pointer
        `}
        style={{
          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
        }}
      >
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="font-bold">{currentOption.code.toUpperCase()}</span>

        {detectedSource !== 'manual' && detectedSource !== 'default' && (
          <span className="hidden sm:inline-block text-[8px] bg-accent/20 border border-accent/40 text-accent-bright px-1 py-0.2 tracking-tighter">
            AUTO
          </span>
        )}

        <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-44 bg-[#07090e]/95 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-1 z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{
            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
          }}
        >
          <div className="px-2 py-1 text-[9px] text-text-secondary uppercase tracking-widest border-b border-white/10 mb-1 flex items-center justify-between">
            <span>IDIOMA // LANG</span>
            {detectedSource !== 'manual' && detectedSource !== 'default' && (
              <span className="text-accent-bright text-[8px]">VIA {detectedSource.toUpperCase()}</span>
            )}
          </div>
          {languages.map((item) => {
            const isActive = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent/20 text-white font-bold border-l-2 border-accent-bright'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.flag}</span>
                  <span>{item.localName}</span>
                </div>
                <span className="text-[10px] text-text-secondary">{item.code.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
