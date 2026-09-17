import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-md mx-auto mt-24 px-4 text-center">
      <p className="font-mono text-signal text-sm mb-2">{t('notFound.code')}</p>
      <h1 className="font-display font-bold text-3xl mb-3">{t('notFound.title')}</h1>
      <p className="text-ink/60 mb-6">{t('notFound.subtitle')}</p>
      <Link to="/" className="font-mono text-sm text-petrol hover:text-signal underline">
        {t('notFound.backLink')}
      </Link>
    </div>
  );
}
