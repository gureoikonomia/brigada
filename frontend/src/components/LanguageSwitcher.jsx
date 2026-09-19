import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'eu', label: 'EU' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={`${styles.switcherGroup} ${className}`} role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lang, i) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          className={`${styles.langBtn} ${i > 0 ? styles.borderDivider : ''} ${
            i18n.resolvedLanguage === lang.code ? styles.langActive : styles.langInactive
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
