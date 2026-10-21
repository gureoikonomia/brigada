import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

function NavLinks({ user, t }) {
  return user ? (
    <Link to="/perfil" className={styles.userLink}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={styles.userAvatar} />
      ) : (
        <span className={styles.userAvatar} aria-hidden="true">
          {user.name?.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={styles.userName}>{user.name}</span>
    </Link>
  ) : (
    <>
      <Link to="/login" className={styles.navLink}>
        {t('nav.login')}
      </Link>
      <Link to="/registro" className={styles.primaryButton}>
        {t('nav.register')}
      </Link>
    </>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('brigada_theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('brigada_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand}>
          {t('nav.brand')}
        </Link>

        {/* Escritorio */}
        <nav className={styles.desktopNav}>
          <NavLinks user={user} t={t} />
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            className={styles.themeButton}
            aria-label={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </nav>

        <nav className={styles.mobileActions} aria-label={t('nav.mobileSettings')}>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            className={styles.themeButton}
            aria-label={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </nav>
      </div>

      <nav className={styles.mobileBottomNav} aria-label={t('nav.mobileNavigation')}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${styles.mobileBottomLink} ${isActive ? styles.mobileBottomLinkActive : ''}`}
        >
          <svg className={styles.mobileBottomIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <span>{t('nav.mobileHome')}</span>
        </NavLink>

        {user && (
          <NavLink
            to="/incidencias/nueva"
            className={({ isActive }) => `${styles.mobileBottomLink} ${styles.mobileBottomCreate} ${isActive ? styles.mobileBottomLinkActive : ''}`}
          >
            <svg className={styles.mobileBottomIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{t('nav.mobileCreate')}</span>
          </NavLink>
        )}

        <NavLink
          to={user ? '/perfil' : '/login'}
          className={({ isActive }) => `${styles.mobileBottomLink} ${isActive ? styles.mobileBottomLinkActive : ''}`}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className={styles.mobileBottomAvatar} />
          ) : (
            <svg className={styles.mobileBottomIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
          <span>{user ? t('nav.mobileProfile') : t('nav.mobileLogin')}</span>
        </NavLink>
      </nav>
    </header>
  );
}