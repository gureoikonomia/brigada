import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

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

  return (
    <header className="bg-petrol text-white border-b-4 border-signal relative">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" onClick={closeMenu} className="font-display font-bold text-2xl tracking-wide">
          {t('nav.brand')}
        </Link>

        {/* Nav de escritorio: visible desde md hacia arriba */}
        <nav className="hidden md:flex items-center gap-4 font-mono text-sm">
          <Link to="/" className="hover:text-signal transition-colors">
            {t('nav.incidents')}
          </Link>

          {user ? (
            <>
              <Link to="/incidencias/nueva" className="px-3 py-1.5 bg-signal hover:bg-signal-dark transition-colors">
                {t('nav.newIncident')}
              </Link>
              {['admin', 'moderator'].includes(user.role) && (
                <Link to="/moderacion" className="hover:text-signal transition-colors">
                  {t('nav.moderation')}
                </Link>
              )}
              <Link to="/perfil" className="text-white/70 hover:text-signal transition-colors">
                {user.name}
              </Link>
              <button onClick={handleLogout} className="hover:text-signal transition-colors">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-signal transition-colors">
                {t('nav.login')}
              </Link>
              <Link to="/registro" className="px-3 py-1.5 bg-signal hover:bg-signal-dark transition-colors">
                {t('nav.register')}
              </Link>
            </>
          )}

          <LanguageSwitcher />
        </nav>

        {/* Botón hamburguesa: solo visible por debajo de md */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
        >
          <span
            className={`block w-6 h-0.5 bg-white transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}
          />
          <span className={`block w-6 h-0.5 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
          <span
            className={`block w-6 h-0.5 bg-white transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}
          />
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <nav className="md:hidden border-t border-white/10 bg-petrol font-mono text-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
            <Link to="/" onClick={closeMenu} className="py-2.5 hover:text-signal transition-colors">
              {t('nav.incidents')}
            </Link>

            {user ? (
              <>
                <Link
                  to="/incidencias/nueva"
                  onClick={closeMenu}
                  className="py-2.5 hover:text-signal transition-colors"
                >
                  {t('nav.newIncidentFull')}
                </Link>
                {['admin', 'moderator'].includes(user.role) && (
                  <Link to="/moderacion" onClick={closeMenu} className="py-2.5 hover:text-signal transition-colors">
                    {t('nav.moderation')}
                  </Link>
                )}
                <Link to="/perfil" onClick={closeMenu} className="py-2.5 text-white/70 hover:text-signal transition-colors">
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="py-2.5 text-left hover:text-signal transition-colors">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="py-2.5 hover:text-signal transition-colors">
                  {t('nav.login')}
                </Link>
                <Link to="/registro" onClick={closeMenu} className="py-2.5 hover:text-signal transition-colors">
                  {t('nav.register')}
                </Link>
              </>
            )}

            <div className="pt-2 mt-1 border-t border-white/10">
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
