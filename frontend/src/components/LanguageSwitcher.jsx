import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'eu', label: 'EU' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={`inline-flex border border-white/30 font-mono text-xs ${className}`} role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lang, i) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          className={`px-2 py-1 transition-colors ${i > 0 ? 'border-l border-white/30' : ''} ${
            i18n.resolvedLanguage === lang.code ? 'bg-signal text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
