import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import ModerationRow from '../components/ModerationRow';
import styles from './ModerationPage.module.css';

const TAB_VALUES = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];
const TAB_KEYS = {
  pendiente: 'moderation.tabPending',
  en_revision: 'moderation.tabInReview',
  resuelta: 'moderation.tabResolved',
  rechazada: 'moderation.tabRejected',
};

export default function ModerationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { votingEnabled } = useAppSettings();
  const isModerator = user?.role === 'moderator';
  const tabValues = isModerator ? ['en_revision'] : TAB_VALUES;
  const [activeTab, setActiveTab] = useState(isModerator ? 'en_revision' : 'pendiente');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listIncidents({ status: activeTab, sortBy: 'recent', limit: 50 })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError(t('moderation.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, votingEnabled]);

  const handleChanged = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  return (
    <div className={`${styles.container} ${styles.embedded}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('moderation.title')}</h2>
        <p className={styles.subtitle}>
          {isModerator ? t('moderation.moderatorSubtitle') : t('moderation.subtitle')}
        </p>
      </div>

      {!isModerator && (
        <div className={styles.tabsRow}>
          {tabValues.map((value) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              aria-pressed={activeTab === value}
              className={`${styles.tabBtn} ${
                activeTab === value ? styles.tabActive : styles.tabInactive
              }`}
            >
              {t(TAB_KEYS[value])}
            </button>
          ))}
        </div>
      )}

      {loading && <p className={styles.loadingText}>{t('common.loading')}</p>}

      {error && (
        <p className={styles.errorBox}>{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            {isModerator ? t('moderation.moderatorEmpty') : t('moderation.empty')}
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className={styles.listPanel}>
          <div className={styles.itemsSpace}>
            {items.map((incident) => (
              <ModerationRow
                key={incident._id}
                incident={incident}
                onChanged={handleChanged}
                allowedStatuses={isModerator ? ['pendiente', 'rechazada'] : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
