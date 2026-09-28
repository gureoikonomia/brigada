import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useAppSettings from '../hooks/useAppSettings';
import styles from './VotingFeatureControl.module.css';

export default function VotingFeatureControl() {
  const { t } = useTranslation();
  const { votingEnabled, loading, saveVotingSetting } = useAppSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = async (event) => {
    setSaving(true);
    setError(null);
    try {
      await saveVotingSetting(event.target.checked);
    } catch {
      setError(t('admin.votingSettingError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.copy}>
        <h2 className={styles.title}>{t('admin.votingSettingTitle')}</h2>
        <p className={styles.description}>{t('admin.votingSettingDescription')}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <label className={styles.toggleLabel}>
        <input
          type="checkbox"
          role="switch"
          checked={votingEnabled}
          onChange={handleChange}
          disabled={loading || saving}
          aria-label={t('admin.votingEnabledLabel')}
          aria-checked={votingEnabled}
          className={styles.toggle}
        />
        <span>{t('admin.votingEnabledLabel')}</span>
      </label>
    </section>
  );
}