import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import { listIncidents, listVotedIncidents } from '../services/incident.service';
import { updateProfile, changePassword } from '../services/auth.service';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';
import AdminStatsWidget from '../components/AdminStatsWidget';
import VotingFeatureControl from '../components/VotingFeatureControl';
import UserManagementTable from '../components/UserManagementTable';
import ModerationRow from '../components/ModerationRow';
import styles from './ProfilePage.module.css';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { votingEnabled } = useAppSettings();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('incidents');

  // Tab 1: Mis incidencias
  const [myIncidents, setMyIncidents] = useState([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [errorMy, setErrorMy] = useState(null);

  // Tab 2: Incidencias votadas
  const [votedIncidents, setVotedIncidents] = useState([]);
  const [loadingVoted, setLoadingVoted] = useState(false);
  const [errorVoted, setErrorVoted] = useState(null);
  const [votedLoaded, setVotedLoaded] = useState(false);

  // Incidencias en revisión para moderadores.
  const [inReviewIncidents, setInReviewIncidents] = useState([]);
  const [loadingInReview, setLoadingInReview] = useState(false);
  const [errorInReview, setErrorInReview] = useState(null);

  // Tab 5: Formulario de ajustes de perfil y contraseña
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', avatarUrl: user?.avatarUrl || '' });
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Cargar mis incidencias
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    listIncidents({ createdBy: user.id, sortBy: 'recent' })
      .then((data) => {
        if (!cancelled) setMyIncidents(data.items);
      })
      .catch(() => {
        if (!cancelled) setErrorMy(t('profile.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoadingMy(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, votingEnabled]);

  // Cargar incidencias votadas si se selecciona la pestaña 2
  useEffect(() => {
    if (activeTab === 'voted' && votingEnabled && !votedLoaded) {
      setLoadingVoted(true);
      setErrorVoted(null);
      listVotedIncidents()
        .then((data) => {
          setVotedIncidents(data.items);
          setVotedLoaded(true);
        })
        .catch(() => {
          setErrorVoted(t('profile.loadError'));
        })
        .finally(() => {
          setLoadingVoted(false);
        });
    }
  }, [activeTab, votedLoaded, t, votingEnabled]);

  // Cargar incidencias en revisión si se selecciona la pestaña de Moderación
  useEffect(() => {
    if (activeTab === 'moderation') {
      setLoadingInReview(true);
      setErrorInReview(null);
      listIncidents({ status: 'en_revision', sortBy: 'recent', limit: 50 })
        .then((data) => {
          setInReviewIncidents(data.items);
        })
        .catch(() => {
          setErrorInReview(t('moderation.loadError'));
        })
        .finally(() => {
          setLoadingInReview(false);
        });
    }
  }, [activeTab, t, votingEnabled]);

  if (!user) return null;

  const isAdminOrMod = ['admin', 'moderator'].includes(user.role);
  const visibleTab = !votingEnabled && activeTab === 'voted' ? 'incidents' : activeTab;

  const handleModeratedChange = (id) => {
    setInReviewIncidents((prev) => prev.filter((item) => item._id !== id));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: profileForm.name, email: profileForm.email });
      updateUser({ name: updated.name, email: updated.email });
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err.response?.data?.message || t('editProfile.saveError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('editProfile.passwordMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || t('editProfile.passwordError'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Tarjeta Header de Perfil con Insignia de Rol */}
      <div className={styles.profileCard}>
        <div className={styles.profileCardInner}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {initials(user.name) || '?'}
            </div>
          )}

          <div className={styles.userInfo}>
            <h1 className={styles.userName}>{user.name}</h1>
            <p className={styles.userEmail}>{user.email}</p>
          </div>

          <div className={styles.profileActions}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Pestañas Navegables */}
      <div className={styles.tabsRow}>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`${styles.tabBtn} ${
            visibleTab === 'incidents' ? styles.tabBtnActive : styles.tabBtnInactive
          }`}
        >
          📋 {t('profile.tabMyIncidents')} ({myIncidents.length})
        </button>

        {votingEnabled && (
          <button
          onClick={() => setActiveTab('voted')}
          className={`${styles.tabBtn} ${
            visibleTab === 'voted' ? styles.tabBtnActive : styles.tabBtnInactive
          }`}
          >
            ⭐ {t('profile.tabVotedIncidents')}
          </button>
        )}

        {isAdminOrMod && (
          <button
            onClick={() => setActiveTab('moderation')}
            className={`${styles.tabBtn} ${
              visibleTab === 'moderation' ? styles.tabBtnActive : styles.tabBtnInactive
            }`}
          >
            ⚖️ {t('profile.tabModeration')}
          </button>
        )}

        {user.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`${styles.tabBtn} ${
              visibleTab === 'admin' ? styles.tabAdminActive : styles.tabAdminInactive
            }`}
          >
            🛡️ {t('profile.tabUsersAdmin')}
          </button>
        )}

        <button
          onClick={() => setActiveTab('settings')}
          className={`${styles.tabBtn} ${
            visibleTab === 'settings' ? styles.tabBtnActive : styles.tabBtnInactive
          }`}
        >
          ⚙️ {t('profile.tabSettings')}
        </button>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}

      {/* Pestaña 1: Mis Incidencias */}
      {visibleTab === 'incidents' && (
        <div>
          <h2 className={styles.sectionTitle}>{t('profile.yourIncidents')}</h2>
          {loadingMy && (
            <div className={styles.skeletonsList}>
              <IncidentCardSkeleton />
              <IncidentCardSkeleton />
            </div>
          )}
          {errorMy && (
            <p className={styles.errorBox}>{errorMy}</p>
          )}
          {!loadingMy && !errorMy && myIncidents.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t('profile.empty')}</p>
            </div>
          )}
          {!loadingMy && myIncidents.length > 0 && (
            <div className={styles.listPanel}>
              <div className={styles.itemsSpace}>
                {myIncidents.map((incident) => (
                  <IncidentCard key={incident._id} incident={incident} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestaña 2: Incidencias Votadas */}
      {visibleTab === 'voted' && votingEnabled && (
        <div>
          <h2 className={styles.sectionTitle}>{t('profile.tabVotedIncidents')}</h2>
          {loadingVoted && (
            <div className={styles.skeletonsList}>
              <IncidentCardSkeleton />
              <IncidentCardSkeleton />
            </div>
          )}
          {errorVoted && (
            <p className={styles.errorBox}>{errorVoted}</p>
          )}
          {!loadingVoted && !errorVoted && votedIncidents.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t('profile.votedEmpty')}</p>
            </div>
          )}
          {!loadingVoted && votedIncidents.length > 0 && (
            <div className={styles.listPanel}>
              <div className={styles.itemsSpace}>
                {votedIncidents.map((incident) => (
                  <IncidentCard key={incident._id} incident={incident} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestaña Moderación (Moderadores y Admins): Incidencias En Revisión */}
      {visibleTab === 'moderation' && isAdminOrMod && (
        <div className={styles.adminSection}>
          <h2 className={styles.sectionTitle}>{t('profile.tabModeration')}</h2>
          <p className={styles.subTitle + ' mb-4'}>
            Revisión de incidencias reportadas en estado En Revisión. Puedes pasarlas a Pendientes o Rechazadas.
          </p>

          {loadingInReview && <p className={styles.loadingText}>{t('common.loading')}</p>}
          {errorInReview && <p className={styles.errorBox}>{errorInReview}</p>}

          {!loadingInReview && !errorInReview && inReviewIncidents.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No hay incidencias en revisión pendiente de moderación.</p>
            </div>
          )}

          {!loadingInReview && inReviewIncidents.length > 0 && (
            <div className={styles.listPanel}>
              <div className={styles.itemsSpace}>
                {inReviewIncidents.map((incident) => (
                  <ModerationRow
                    key={incident._id}
                    incident={incident}
                    onChanged={handleModeratedChange}
                    onDeleted={handleModeratedChange}
                    allowedStatuses={['pendiente', 'rechazada']}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestaña 4: Panel Admin & Gestión de Usuarios */}
      {visibleTab === 'admin' && user.role === 'admin' && (
        <div className={styles.adminSection}>
          <VotingFeatureControl />
          <AdminStatsWidget />
          <UserManagementTable />
        </div>
      )}

      {/* Pestaña 5: Seguridad & Ajustes */}
      {visibleTab === 'settings' && (
        <div className={styles.settingsGrid}>
          {/* Datos Personales */}
          <section className={styles.sectionCard}>
            <h3 className={styles.subSectionTitle}>{t('editProfile.accountData')}</h3>
            <form onSubmit={handleProfileSubmit} className={styles.formSpace}>
              <div>
                <label className={styles.fieldLabel}>
                  {t('editProfile.nameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, name: e.target.value });
                    setProfileSuccess(false);
                  }}
                  className={styles.formInput}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>
                  {t('editProfile.emailLabel')}
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, email: e.target.value });
                    setProfileSuccess(false);
                  }}
                  className={styles.formInput}
                />
              </div>

              {profileError && (
                <p className={styles.formError}>{profileError}</p>
              )}
              {profileSuccess && (
                <p className={styles.formSuccess}>
                  {t('editProfile.saveSuccess')}
                </p>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className={styles.saveProfileBtn}
              >
                {savingProfile ? t('common.saving') : t('editProfile.saveData')}
              </button>
            </form>
          </section>

          {/* Cambio de Contraseña */}
          <section className={styles.sectionCard}>
            <h3 className={styles.subSectionTitle}>{t('editProfile.changePassword')}</h3>
            <form onSubmit={handlePasswordSubmit} className={styles.formSpace}>
              <div>
                <label className={styles.fieldLabel}>
                  {t('editProfile.currentPasswordLabel')}
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                    setPasswordSuccess(false);
                  }}
                  className={styles.formInput}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>
                  {t('editProfile.newPasswordLabel')}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    setPasswordSuccess(false);
                  }}
                  className={styles.formInput}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>
                  {t('editProfile.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                    setPasswordSuccess(false);
                  }}
                  className={styles.formInput}
                />
              </div>

              {passwordError && (
                <p className={styles.formError}>{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className={styles.formSuccess}>
                  {t('editProfile.passwordSuccess')}
                </p>
              )}

              <button
                type="submit"
                disabled={savingPassword}
                className={styles.savePasswordBtn}
              >
                {savingPassword ? t('editProfile.changingPassword') : t('editProfile.changePasswordSubmit')}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
