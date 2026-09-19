import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('login.title')}</h1>
      <p className={styles.subtitle}>{t('login.subtitle')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t('login.emailLabel')}
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.passwordLabelRow}>
            <label className={styles.label}>
              {t('login.passwordLabel')}
            </label>
            <Link to="/olvide-contrasena" className={styles.forgotLink}>
              {t('login.forgotPassword')}
            </Link>
          </div>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={styles.input}
          />
        </div>

        {error && (
          <p className={styles.errorBox}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={styles.submitBtn}
        >
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>

      <p className={styles.footerText}>
        {t('login.noAccount')}{' '}
        <Link to="/registro" className={styles.link}>
          {t('login.registerLink')}
        </Link>
      </p>
    </div>
  );
}
