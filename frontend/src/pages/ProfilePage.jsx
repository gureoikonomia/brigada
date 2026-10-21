import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import { listIncidents, listVotedIncidents } from '../services/incident.service';
import { updateProfile, uploadProfileAvatar, changePassword } from '../services/auth.service';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';
import AdminStatsWidget from '../components/AdminStatsWidget';
import VotingFeatureControl from '../components/VotingFeatureControl';
import UserManagementTable from '../components/UserManagementTable';
import ModerationPage from './ModerationPage';
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
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'settings') return 'settings';
    if (requestedTab === 'moderation' && ['admin', 'moderator'].includes(user?.role)) {
      return 'moderation';
    }
    return 'incidents';
  });

  // Tab 1: Mis incidencias
  const [myIncidents, setMyIncidents] = useState([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [errorMy, setErrorMy] = useState(null);

  // Tab 2: Incidencias votadas
  const [votedIncidents, setVotedIncidents] = useState([]);
  const [loadingVoted, setLoadingVoted] = useState(false);
  const [errorVoted, setErrorVoted] = useState(null);
  const [votedLoaded, setVotedLoaded] = useState(false);

  // Tab 5: Formulario de ajustes de perfil y contraseña
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  if (!user) return null;

  const visibleTab = !votingEnabled && activeTab === 'voted' ? 'incidents' : activeTab;

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

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(false);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError(t('profile.avatarInvalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('profile.avatarTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await uploadProfileAvatar(file);
      updateUser({ avatarUrl: updated.avatarUrl });
      setAvatarSuccess(true);
    } catch (err) {
      setAvatarError(err.response?.data?.message || t('profile.avatarUploadError'));
    } finally {
      setUploadingAvatar(false);
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
            <label className={styles.avatarPicker}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className={styles.avatarInput}
                aria-label={t('profile.changeAvatar')}
              />
              {uploadingAvatar ? t('profile.avatarUploading') : t('profile.changeAvatar')}
            </label>
            <button onClick={handleLogout} className={styles.logoutButton}>
              {t('nav.logout')}
            </button>
          </div>
        </div>
        {(avatarError || avatarSuccess) && (
          <p
            className={avatarError ? styles.avatarError : styles.avatarSuccess}
            role={avatarError ? 'alert' : 'status'}
          >
            {avatarError || t('profile.avatarUploadSuccess')}
          </p>
        )}
      </div>

      <div className={styles.sectionSelector}>
        <label htmlFor="profile-section" className={styles.sectionSelectorLabel}>
          {t('profile.sectionSelectorLabel')}
        </label>
        <select
          id="profile-section"
          value={visibleTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className={styles.sectionSelectorInput}
        >
          <optgroup label={t('profile.sectionGroupActivity')}>
            <option value="incidents">📍 {t('profile.tabMyIncidents')}</option>
            {votingEnabled && (
              <option value="voted">❤️ {t('profile.tabVotedIncidents')}</option>
            )}
          </optgroup>
          {['admin', 'moderator'].includes(user.role) && (
            <optgroup label={t('profile.sectionGroupManagement')}>
              <option value="moderation">🔎 {t('nav.moderation')}</option>
              {user.role === 'admin' && (
                <option value="admin">⚙️ {t('profile.adminPanel')}</option>
              )}
            </optgroup>
          )}
          <optgroup label={t('profile.sectionGroupAccount')}>
            <option value="settings">🔐 {t('profile.tabSettings')}</option>
          </optgroup>
        </select>
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

      {visibleTab === 'admin' && user.role === 'admin' && (
        <div className={styles.adminSection}>
          <h2 className={styles.sectionTitle}>{t('profile.adminPanel')}</h2>
          <VotingFeatureControl />
          <AdminStatsWidget />
          <UserManagementTable />
        </div>
      )}

      {visibleTab === 'moderation' && ['admin', 'moderator'].includes(user.role) && (
        <ModerationPage embedded />
      )}

      {visibleTab === 'settings' && (
        <div className={styles.settingsGrid}>
          {/* Datos Personales */}
          <section className={styles.sectionCard}>
            <h3 className={styles.subSectionTitle}>{t('editProfile.accountData')}</h3>
            <form onSubmit={handleProfileSubmit} className={styles.formSpace}>
              <div>
                <label htmlFor="profile-name" className={styles.fieldLabel}>
                  {t('editProfile.nameLabel')}
                </label>
                <input
                  id="profile-name"
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
                <label htmlFor="profile-email" className={styles.fieldLabel}>
                  {t('editProfile.emailLabel')}
                </label>
                <input
                  id="profile-email"
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
                <label htmlFor="profile-current-password" className={styles.fieldLabel}>
                  {t('editProfile.currentPasswordLabel')}
                </label>
                <input
                  id="profile-current-password"
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
                <label htmlFor="profile-new-password" className={styles.fieldLabel}>
                  {t('editProfile.newPasswordLabel')}
                </label>
                <input
                  id="profile-new-password"
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
                <label htmlFor="profile-confirm-password" className={styles.fieldLabel}>
                  {t('editProfile.confirmPasswordLabel')}
                </label>
                <input
                  id="profile-confirm-password"
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
