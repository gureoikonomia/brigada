import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { confirmAccountDeletion, requestAccountDeletion } from '../services/auth.service';
import styles from './AccountDeletionPage.module.css';

export default function AccountDeletionPage() {
  const { t } = useTranslation();
  const { clearLocalSession } = useAuth();
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const hasToken = Boolean(uid && token);
  const hasPartialToken = Boolean(uid) !== Boolean(token);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [mediaCleanupPending, setMediaCleanupPending] = useState(false);

  const handleRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await requestAccountDeletion(email);
      setMessage(t('accountDeletion.requestSubmitted'));
    } catch {
      setError(t('accountDeletion.requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmAccountDeletion({ uid, token });
      setDeleted(true);
      setMediaCleanupPending(Boolean(result.mediaCleanupPending));
      clearLocalSession();
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('accountDeletion.confirmError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('accountDeletion.title')}</h1>
      {hasToken ? (
        deleted ? (
          <p className={styles.success} role="status">
            {mediaCleanupPending
              ? t('accountDeletion.completeMediaPending')
              : t('accountDeletion.complete')}
          </p>
        ) : (
          <section className={styles.card}>
            <p className={styles.description}>{t('accountDeletion.confirmDescription')}</p>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? t('accountDeletion.confirming') : t('accountDeletion.confirmButton')}
            </button>
          </section>
        )
      ) : hasPartialToken ? (
        <p className={styles.error} role="alert">{t('accountDeletion.invalidLink')}</p>
      ) : (
        <section className={styles.card}>
          <p className={styles.description}>{t('accountDeletion.requestDescription')}</p>
          <form onSubmit={handleRequest} className={styles.form}>
            <label htmlFor="account-deletion-email" className={styles.label}>
              {t('accountDeletion.emailLabel')}
            </label>
            <input
              id="account-deletion-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={styles.input}
            />
            {message && <p className={styles.success} role="status">{message}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? t('accountDeletion.requesting') : t('accountDeletion.requestButton')}
            </button>
          </form>
        </section>
      )}
      <p className={styles.footer}>
        <Link to="/login" className={styles.link}>{t('accountDeletion.loginLink')}</Link>
      </p>
    </div>
  );
}
