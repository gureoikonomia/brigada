import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/auth.service';

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
    <div className="max-w-md mx-auto px-4 py-8">
      <Link to="/perfil" className="font-mono text-xs text-ink/50 hover:text-signal">
        {t('editProfile.backToProfile')}
      </Link>

      <h1 className="font-display font-bold text-3xl mt-3 mb-6">{t('editProfile.title')}</h1>

      <section className="bg-paper border border-line p-6 mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink/60 mb-4">{t('editProfile.accountData')}</h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
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
              className="w-full border border-line bg-white px-3 py-2 focus:border-signal outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
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
              className="w-full border border-line bg-white px-3 py-2 focus:border-signal outline-none"
            />
          </div>

          {profileError && (
            <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-ok text-sm font-mono border border-ok bg-ok/5 px-3 py-2">
              {t('editProfile.saveSuccess')}
            </p>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="bg-petrol hover:bg-petrol-light text-white font-mono font-medium px-4 py-2 disabled:opacity-60 transition-colors"
          >
            {savingProfile ? t('common.saving') : t('editProfile.saveData')}
          </button>
        </form>
      </section>

      <section className="bg-paper border border-line p-6">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink/60 mb-4">{t('editProfile.changePassword')}</h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
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
              className="w-full border border-line bg-white px-3 py-2 focus:border-signal outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
              {t('editProfile.newPasswordLabel')} <span className="text-ink/40">{t('editProfile.newPasswordHint')}</span>
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
              className="w-full border border-line bg-white px-3 py-2 focus:border-signal outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
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
              className="w-full border border-line bg-white px-3 py-2 focus:border-signal outline-none"
            />
          </div>

          {passwordError && (
            <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-ok text-sm font-mono border border-ok bg-ok/5 px-3 py-2">
              {t('editProfile.passwordSuccess')}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="bg-signal hover:bg-signal-dark text-white font-mono font-medium px-4 py-2 disabled:opacity-60 transition-colors"
          >
            {savingPassword ? t('editProfile.changingPassword') : t('editProfile.changePasswordSubmit')}
          </button>
        </form>
      </section>
    </div>
  );
}
