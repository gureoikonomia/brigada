import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import styles from './ResetPasswordPage.module.css';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Los parámetros vienen de la URL: /recuperar-contrasena?token=xxx&uid=yyy
  const token = searchParams.get('token');
  const uid = searchParams.get('uid');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Si no hay token o uid en la URL, el enlace es inválido
  const invalidLink = !token || !uid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { uid, token, newPassword });
      setSuccess(true);
      // Redirigir al login tras 3 segundos
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('resetPassword.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (invalidLink) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1 className={styles.title}>{t('resetPassword.invalidTitle')}</h1>
          <p className={styles.errorDesc}>{t('resetPassword.invalidDescription')}</p>
          <Link to="/olvide-contrasena" className={styles.actionLink}>
            {t('resetPassword.requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✅</div>
          <h1 className={styles.title}>{t('resetPassword.successTitle')}</h1>
          <p className={styles.successText}>{t('resetPassword.successDescription')}</p>
          <p className={styles.redirectHint}>{t('resetPassword.redirectHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('resetPassword.title')}</h1>
        <p className={styles.subtitle}>{t('resetPassword.subtitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>{t('resetPassword.newPasswordLabel')}</label>
            <input
              id="reset-new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
            />
            <p className={styles.passwordHint}>{t('resetPassword.passwordHint')}</p>
          </div>

          <div>
            <label className={styles.label}>{t('resetPassword.confirmPasswordLabel')}</label>
            <input
              id="reset-confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          {error && <p className={styles.errorBox}>{error}</p>}

          <button
            id="reset-submit"
            type="submit"
            disabled={submitting}
            className={styles.submitBtn}
          >
            {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
