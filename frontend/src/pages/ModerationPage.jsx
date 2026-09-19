import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import ModerationRow from '../components/ModerationRow';
import AdminStatsWidget from '../components/AdminStatsWidget';
import UserManagementTable from '../components/UserManagementTable';
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
  const [activeTab, setActiveTab] = useState('pendiente'); // 'pendiente' | 'en_revision' | 'resuelta' | 'rechazada' | 'usuarios'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTab === 'usuarios') return;

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
  }, [activeTab]);

  const handleChanged = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleDeleted = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('moderation.title')}</h1>
        <p className={styles.subtitle}>{t('moderation.subtitle')}</p>
      </div>

      {/* Widget KPI para Administradores y Moderadores */}
      <AdminStatsWidget />

      {/* Pestañas de Moderación */}
      <div className={styles.tabsRow}>
        {TAB_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`${styles.tabBtn} ${
              activeTab === value ? styles.tabActive : styles.tabInactive
            }`}
          >
            {t(TAB_KEYS[value])}
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`${styles.tabBtn} ${
              activeTab === 'usuarios' ? styles.tabAdminActive : styles.tabAdminInactive
            }`}
          >
            🛡️ {t('admin.manageUsers')}
          </button>
        )}
      </div>

      {activeTab === 'usuarios' && isAdmin ? (
        <UserManagementTable />
      ) : (
        <>
          {loading && <p className={styles.loadingText}>{t('common.loading')}</p>}

          {error && (
            <p className={styles.errorBox}>{error}</p>
          )}

          {!loading && !error && items.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t('moderation.empty')}</p>
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
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
