import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('brigada_theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('brigada_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const closeMenu = () => setMenuOpen(false);

  // Componente interno para renderizar los enlaces y evitar duplicar código
  const NavLinks = ({ isMobile = false }) => {
    const linkClass = isMobile ? styles.mobileNavLink : styles.navLink;
    const canModerate = user && ['admin', 'moderator'].includes(user.role);

    return (
      <>
        {/* <Link to="/" onClick={closeMenu} className={linkClass}>
          {t('nav.incidents')}
        </Link> */}

        {user ? (
          <>
            {canModerate && (
              <Link 
                to="/moderacion" 
                onClick={closeMenu} 
                className={isMobile ? styles.mobileModerationLink : styles.moderationLink}
              >
                <span className={styles.pulseDot} />
                {t('nav.moderation')}
              </Link>
            )}

            <Link to="/perfil" onClick={closeMenu} className={isMobile ? styles.mobileUserLink : styles.userLink}>
              <span className={styles.userAvatar} aria-hidden="true">
                {user.name?.charAt(0).toUpperCase()}
              </span>
              <span className={styles.userName}>{user.name}</span>
            </Link>

          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu} className={linkClass}>
              {t('nav.login')}
            </Link>
            <Link 
              to="/registro" 
              onClick={closeMenu} 
              className={isMobile ? styles.mobileNavLink : styles.primaryButton}
            >
              {t('nav.register')}
            </Link>
          </>
        )}
      </>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" onClick={closeMenu} className={styles.brand}>
          {t('nav.brand')}
        </Link>

        {/* Escritorio */}
        <nav className={styles.desktopNav}>
          <NavLinks />
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

        {/* Botón Hamburguesa Móvil */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          className={styles.hamburgerButton}
        >
          <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineTopOpen : ''}`} />
          <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineMiddleOpen : ''}`} />
          <span className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineBottomOpen : ''}`} />
        </button>
      </div>

      {/* Menú Desplegable Móvil */}
      {menuOpen && (
        <nav className={styles.mobileNav}>
          <div className={styles.mobileNavContent}>
            <NavLinks isMobile={true} />
            <div className={styles.mobileSwitcherContainer}>
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className={styles.mobileThemeButton}
              >
                {darkMode ? `☀ ${t('nav.lightMode')}` : `☾ ${t('nav.darkMode')}`}
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}