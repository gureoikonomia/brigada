import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') return `${styles.roleBadge} ${styles.roleAdmin}`;
    if (role === 'moderator') return `${styles.roleBadge} ${styles.roleModerator}`;
    return `${styles.roleBadge} ${styles.roleUser}`;
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" onClick={closeMenu} className={styles.brand}>
          {t('nav.brand')}
        </Link>

        {/* Nav de escritorio */}
        <nav className={styles.desktopNav}>
          <Link to="/" className={styles.navLink}>
            {t('nav.incidents')}
          </Link>

          {user ? (
            <>
              <Link to="/incidencias/nueva" className={styles.primaryButton}>
                {t('nav.newIncident')}
              </Link>
              {['admin', 'moderator'].includes(user.role) && (
                <Link to="/moderacion" className={styles.moderationLink}>
                  <span className={styles.pulseDot}></span>
                  {t('nav.moderation')}
                </Link>
              )}
              <Link to="/perfil" className={styles.userLink}>
                <span className={styles.userName}>{user.name}</span>
                <span className={getRoleBadgeStyle(user.role)}>
                  {t(`role.${user.role}`, { defaultValue: user.role })}
                </span>
              </Link>
              <button onClick={handleLogout} className={styles.logoutButton}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.navLink}>
                {t('nav.login')}
              </Link>
              <Link to="/registro" className={styles.primaryButton}>
                {t('nav.register')}
              </Link>
            </>
          )}

          <LanguageSwitcher />
        </nav>

        {/* Botón hamburguesa movil */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          className={styles.hamburgerButton}
        >
          <span
            className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineTopOpen : ''}`}
          />
          <span
            className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineMiddleOpen : ''}`}
          />
          <span
            className={`${styles.hamburgerLine} ${menuOpen ? styles.hamburgerLineBottomOpen : ''}`}
          />
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <nav className={styles.mobileNav}>
          <div className={styles.mobileNavContent}>
            <Link to="/" onClick={closeMenu} className={styles.mobileNavLink}>
              {t('nav.incidents')}
            </Link>

            {user ? (
              <>
                <Link to="/incidencias/nueva" onClick={closeMenu} className={styles.mobileNavLink}>
                  {t('nav.newIncidentFull')}
                </Link>
                {['admin', 'moderator'].includes(user.role) && (
                  <Link to="/moderacion" onClick={closeMenu} className={styles.mobileModerationLink}>
                    <span className={styles.pulseDot}></span>
                    {t('nav.moderation')}
                  </Link>
                )}
                <Link to="/perfil" onClick={closeMenu} className={styles.mobileUserLink}>
                  <span>{user.name}</span>
                  <span className={styles.roleBadge + ' ' + styles.roleUser}>
                    {t(`role.${user.role}`, { defaultValue: user.role })}
                  </span>
                </Link>
                <button onClick={handleLogout} className={styles.mobileLogoutButton}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className={styles.mobileNavLink}>
                  {t('nav.login')}
                </Link>
                <Link to="/registro" onClick={closeMenu} className={styles.mobileNavLink}>
                  {t('nav.register')}
                </Link>
              </>
            )}

            <div className={styles.mobileSwitcherContainer}>
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
