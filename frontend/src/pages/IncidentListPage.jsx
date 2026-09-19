import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';
import styles from './IncidentListPage.module.css';

const CATEGORY_VALUES = ['', 'infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'];
const PUBLIC_STATUS_VALUES = ['', 'pendiente', 'resuelta'];
const ALL_STATUS_VALUES = ['', 'pendiente', 'en_revision', 'resuelta', 'rechazada'];

export default function IncidentListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sortBy: 'recent', page: 1 });

  const isPrivileged = user && ['admin', 'moderator'].includes(user.role);
  const statusOptions = isPrivileged ? ALL_STATUS_VALUES : PUBLIC_STATUS_VALUES;

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
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t('incidentList.title')}</h1>

        <div className={styles.filtersGroup}>
          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className={styles.selectInput}
          >
            {CATEGORY_VALUES.map((v) => (
              <option key={v} value={v}>{v === '' ? t('category.all') : t(`category.${v}`)}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className={styles.selectInput}
          >
            {statusOptions.map((v) => (
              <option key={v} value={v}>{v === '' ? t('status.all') : t(`status.${v}`)}</option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className={styles.selectInput}
          >
            <option value="recent">{t('incidentList.sortRecent')}</option>
            <option value="popular">{t('incidentList.sortPopular')}</option>
          </select>
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
          <div className={styles.listPanel}>
            <div className={styles.itemsSpace}>
              {items.map((incident) => (
                <IncidentCard key={incident._id} incident={incident} />
              ))}
            </div>
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
