import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

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
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="font-display font-bold text-3xl mb-1">{t('register.title')}</h1>
      <p className="text-ink/60 text-sm mb-6">{t('register.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('register.nameLabel')}
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 focus:border-signal outline-none"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('register.emailLabel')}
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 focus:border-signal outline-none"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('register.passwordLabel')} <span className="text-ink/40">{t('register.passwordHint')}</span>
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 focus:border-signal outline-none"
          />
        </div>

        {error && (
          <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-signal hover:bg-signal-dark text-white font-mono font-medium py-2.5 disabled:opacity-60 transition-colors"
        >
          {submitting ? t('register.submitting') : t('register.submit')}
        </button>
      </form>

      <p className="text-sm text-ink/60 mt-4">
        {t('register.hasAccount')}{' '}
        <Link to="/login" className="text-petrol font-medium hover:text-signal">
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  );
}
