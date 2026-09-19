import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('register.title')}</h1>
      <p className={styles.subtitle}>{t('register.subtitle')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t('register.nameLabel')}
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t('register.emailLabel')}
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
          <label className={styles.label}>
            {t('register.passwordLabel')} <span className={styles.hint}>{t('register.passwordHint')}</span>
          </label>
          <input
            type="password"
            required
            minLength={8}
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
          {submitting ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className={styles.footerText}>
        {t('register.hasAccount')}{' '}
        <Link to="/login" className={styles.link}>
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  );
}
