import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  getPrivacyNotice,
  resendVerification,
} from '../services/auth.service';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(null);
  const [privacyNoticeLoaded, setPrivacyNoticeLoaded] = useState(false);
  const [privacyNoticeLoadFailed, setPrivacyNoticeLoadFailed] = useState(false);
  const [privacyNoticeAcknowledged, setPrivacyNoticeAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    getPrivacyNotice()
      .then(setPrivacyNotice)
      .catch(() => setPrivacyNoticeLoadFailed(true))
      .finally(() => setPrivacyNoticeLoaded(true));
  }, []);

  const privacyConfigurationMissing = import.meta.env.PROD
    && (!privacyNotice?.url || !privacyNotice?.version);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        ...form,
        privacyNoticeAcknowledged,
        privacyNoticeVersion: privacyNotice?.version,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || t('register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendMessage(null);
    setResending(true);
    try {
      await resendVerification(form.email);
      setResendMessage(t('register.verificationResent'));
    } catch {
      setResendMessage(t('register.error'));
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t('register.title')}</h1>
        <p className={styles.successBox} role="status">{t('register.verificationSent')}</p>
        <button
          type="button"
          disabled={resending}
          onClick={handleResendVerification}
          className={styles.submitBtn}
        >
          {resending ? t('register.resendingVerification') : t('register.resendVerification')}
        </button>
        {resendMessage && <p className={styles.successBox} role="status">{resendMessage}</p>}
        <p className={styles.footerText}>
          {t('register.hasAccount')}{' '}
          <Link to="/login" state={location.state} className={styles.link}>
            {t('register.loginLink')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('register.title')}</h1>
      <p className={styles.subtitle}>{t('register.subtitle')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label htmlFor="register-name" className={styles.label}>
            {t('register.nameLabel')}
          </label>
          <input
            id="register-name"
            type="text"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="register-email" className={styles.label}>
            {t('register.emailLabel')}
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="register-password" className={styles.label}>
            {t('register.passwordLabel')} <span className={styles.hint}>{t('register.passwordHint')}</span>
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={styles.input}
          />
        </div>

        {privacyNotice?.url && (
          <label className={styles.privacyAcknowledgement}>
            <input
              type="checkbox"
              required
              checked={privacyNoticeAcknowledged}
              onChange={(event) => setPrivacyNoticeAcknowledged(event.target.checked)}
            />
            <span>
              {t('register.privacyNoticeAcknowledgement')}{' '}
              <a href={privacyNotice.url} target="_blank" rel="noreferrer">
                {t('register.privacyNoticeLink')}
              </a>
            </span>
          </label>
        )}

        {privacyConfigurationMissing && (
          <p className={styles.errorBox} role="alert">
            {t('register.privacyNoticeUnavailable')}
          </p>
        )}
        {privacyNoticeLoadFailed && import.meta.env.PROD && (
          <p className={styles.errorBox} role="alert">{t('register.privacyNoticeUnavailable')}</p>
        )}

        {error && (
          <p className={styles.errorBox} role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            !privacyNoticeLoaded ||
            privacyConfigurationMissing ||
            (Boolean(privacyNotice?.url) && !privacyNoticeAcknowledged)
          }
          className={styles.submitBtn}
        >
          {submitting ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className={styles.footerText}>
        {t('register.hasAccount')}{' '}
        <Link to="/login" state={location.state} className={styles.link}>
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  );
}
