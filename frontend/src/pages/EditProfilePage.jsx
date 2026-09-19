import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/auth.service';
import styles from './EditProfilePage.module.css';

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setSavingProfile(true);
    try {
      const updated = await updateProfile(profileForm);
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
      <Link to="/perfil" className={styles.backLink}>
        {t('editProfile.backToProfile')}
      </Link>

      <h1 className={styles.title}>{t('editProfile.title')}</h1>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>{t('editProfile.accountData')}</h2>

        <form onSubmit={handleProfileSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>
              {t('editProfile.nameLabel')}
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={profileForm.name}
              onChange={(e) => {
                setProfileForm({ ...profileForm, name: e.target.value });
                setProfileSuccess(false);
              }}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>
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
              className={styles.input}
            />
          </div>

          {profileError && (
            <p className={styles.errorBox}>{profileError}</p>
          )}
          {profileSuccess && (
            <p className={styles.successBox}>
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

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>{t('editProfile.changePassword')}</h2>

        <form onSubmit={handlePasswordSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>
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
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>
              {t('editProfile.newPasswordLabel')} <span className={styles.hint}>{t('editProfile.newPasswordHint')}</span>
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
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>
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
              className={styles.input}
            />
          </div>

          {passwordError && (
            <p className={styles.errorBox}>{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className={styles.successBox}>
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
  );
}
