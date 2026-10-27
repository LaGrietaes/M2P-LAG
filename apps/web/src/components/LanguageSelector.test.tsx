import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider, useTranslation } from '../lib/i18n/I18nContext';
import { LanguageSelector } from './LanguageSelector';

function TestApp() {
  const { t } = useTranslation();
  return (
    <div>
      <LanguageSelector />
      <span data-testid="title">{t('landing.paste_url_label')}</span>
    </div>
  );
}

describe('LanguageSelector Component', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders with initial Spanish language and opens menu on click', () => {
    render(
      <I18nProvider>
        <TestApp />
      </I18nProvider>
    );

    // Initial state: ES
    expect(screen.getByText('ES')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('01 // PASTE VIDEO URL');

    // Click to open language selector
    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);

    // Check that all 4 options are displayed
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Català')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
  });

  it('switches language and persists to localStorage on selection', () => {
    render(
      <I18nProvider>
        <TestApp />
      </I18nProvider>
    );

    // Open menu
    const toggleBtn = screen.getByRole('button', { name: /select language/i });
    fireEvent.click(toggleBtn);

    // Select Catalan
    const catBtn = screen.getByText('Català');
    fireEvent.click(catBtn);

    // Language code updated
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('01 // ENGANXA LA URL DEL VÍDEO');

    // Stored in localStorage
    expect(localStorage.getItem('m2p_language')).toBe('ca');

    // Switch to French
    fireEvent.click(screen.getByRole('button', { name: /select language/i }));
    fireEvent.click(screen.getByText('Français'));

    expect(screen.getByText('FR')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('01 // COLLER L’URL DE LA VIDÉO');
    expect(localStorage.getItem('m2p_language')).toBe('fr');
  });

  it('renders footer variant with discrete clickable language links', () => {
    render(
      <I18nProvider>
        <LanguageSelector variant="footer" />
      </I18nProvider>
    );

    expect(screen.getByRole('button', { name: /spanish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /catalan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /french/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /catalan/i }));
    expect(localStorage.getItem('m2p_language')).toBe('ca');
  });
});
