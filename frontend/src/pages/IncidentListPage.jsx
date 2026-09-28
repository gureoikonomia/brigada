import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { listIncidents } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';
import styles from './IncidentListPage.module.css';

const CATEGORY_VALUES = ['infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'];
const STATUS_VALUES = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];
const PUBLIC_STATUS_VALUES = ['pendiente', 'resuelta'];

export default function IncidentListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { votingEnabled } = useAppSettings();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sortBy: 'recent', page: 1 });

  const isPrivileged = user && ['admin', 'moderator'].includes(user.role);
  const statusOptions = isPrivileged ? STATUS_VALUES : PUBLIC_STATUS_VALUES;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listIncidents(filters)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch(() => {
        if (!cancelled) setError(t('incidentList.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, votingEnabled]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t('incidentList.title')}</h1>

        <div className={`${styles.toolbar} ${!votingEnabled ? styles.toolbarWithoutVoting : ''}`}>
          <Link to="/incidencias/nueva" className={styles.newIncidentButton}>
            {t('nav.newIncidentFull')}
          </Link>

          <div className={styles.filterField}>
            <label htmlFor="incident-category" className={styles.filterLabel}>
              {t('incidentList.categoryFilter')}
            </label>
            <select
              id="incident-category"
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className={styles.selectInput}
            >
              <option value="">{t('category.all')}</option>
              {CATEGORY_VALUES.map((category) => (
                <option key={category} value={category}>{t(`category.${category}`)}</option>
              ))}
            </select>
          </div>

          <label htmlFor="incident-status" className={styles.filterField}>
            <span className={styles.filterLabel}>{t('incidentList.statusFilter')}</span>
            <select
              id="incident-status"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className={styles.selectInput}
            >
              <option value="">{t('status.all')}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{t(`status.${status}`)}</option>
              ))}
            </select>
          </label>

          {votingEnabled && (
            <label htmlFor="incident-sort" className={styles.filterField}>
              <span className={styles.filterLabel}>{t('incidentList.sortFilter')}</span>
              <select
                id="incident-sort"
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className={styles.selectInput}
              >
                <option value="recent">{t('incidentList.sortRecent')}</option>
                <option value="popular">{t('incidentList.sortPopular')}</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {loading && (
        <div className={styles.skeletonsList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <IncidentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <p className={styles.errorBox}>{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>{t('incidentList.empty')}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className={styles.itemsSpace}>
            {items.map((incident) => (
              <IncidentCard key={incident._id} incident={incident} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className={styles.pageBtn}
              >
                {t('incidentList.prev')}
              </button>
              <span className={styles.pageText}>
                {t('incidentList.pageOf', { page: pagination.page, totalPages: pagination.totalPages })}
              </span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className={styles.pageBtn}
              >
                {t('incidentList.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
