import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { verifyEmail } from '../services/auth.service';
import styles from './ResetPasswordPage.module.css';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const { clearLocalSession } = useAuth();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);
  const [error, setError] = useState(null);
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyEmail({ uid, token });
      if (result.emailChanged) clearLocalSession();
      setEmailChanged(Boolean(result.emailChanged));
      setVerified(true);
    } catch {
      setError(t('verifyEmail.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('verifyEmail.title')}</h1>
        {!token || !uid ? (
          <p className={styles.errorBox} role="alert">{t('verifyEmail.error')}</p>
        ) : verified ? (
          <>
            <p className={styles.successText} role="status">
              {t(emailChanged ? 'verifyEmail.emailChangedSuccess' : 'verifyEmail.success')}
            </p>
            <Link to="/login" className={styles.actionLink}>{t('verifyEmail.login')}</Link>
          </>
        ) : (
          <>
            {error && <p className={styles.errorBox} role="alert">{error}</p>}
            <button
              type="button"
              onClick={handleVerify}
              disabled={submitting}
              className={styles.submitBtn}
            >
              {submitting ? t('verifyEmail.loading') : t('verifyEmail.verify')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
