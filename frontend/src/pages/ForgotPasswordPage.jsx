import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || t('forgotPassword.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✉️</div>
          <h1 className={styles.title}>{t('forgotPassword.sentTitle')}</h1>
          <p className={styles.sentText}>{t('forgotPassword.sentDescription')}</p>
          <p className={styles.sentHint}>{t('forgotPassword.sentHint')}</p>
          <Link to="/login" className={styles.backLink}>
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('forgotPassword.title')}</h1>
        <p className={styles.subtitle}>{t('forgotPassword.subtitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>{t('forgotPassword.emailLabel')}</label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="tu@email.com"
            />
          </div>

          {error && <p className={styles.errorBox}>{error}</p>}

          <button
            id="forgot-submit"
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.backLink}>
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
