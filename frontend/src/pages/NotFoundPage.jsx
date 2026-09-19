import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <p className={styles.codeLabel}>{t('notFound.code')}</p>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.subtitle}>{t('notFound.subtitle')}</p>
      <Link to="/" className={styles.homeLink}>
        {t('notFound.backLink')}
      </Link>
    </div>
  );
}
