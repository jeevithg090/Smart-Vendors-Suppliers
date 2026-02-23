import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: Record<string, unknown>,
          elementId: string
        ) => unknown;
      };
    };
  }
}

const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';

const INCLUDED_LANGUAGES = [
  'en',
  'hi',
  'bn',
  'ta',
  'te',
  'kn',
  'ml',
  'mr',
  'gu',
  'pa',
  'ur',
].join(',');

export default function LanguageTranslator() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: INCLUDED_LANGUAGES,
          autoDisplay: false,
          layout: 0, // google.translate.TranslateElement.InlineLayout.SIMPLE
        },
        GOOGLE_TRANSLATE_ELEMENT_ID
      );
    };

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID);
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
      return;
    }

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit?.();
    }
  }, []);

  return (
    <div className="fixed top-3 right-4 z-[9999] translate-toolbar no-print">
      <div className="translate-toolbar__label">Translate</div>
      <div className="translate-toolbar__control">
        <span aria-hidden="true" className="translate-toolbar__icon">🌐</span>
        <div className="translate-select-wrap">
          <div id={GOOGLE_TRANSLATE_ELEMENT_ID} />
          <span aria-hidden="true" className="translate-select-arrow">▾</span>
        </div>
      </div>
    </div>
  );
}
