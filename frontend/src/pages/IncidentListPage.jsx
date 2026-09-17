import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incident.service';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';

const CATEGORY_VALUES = ['', 'infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'];
const STATUS_VALUES = ['', 'pendiente', 'en_revision', 'resuelta', 'rechazada'];

export default function IncidentListPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sortBy: 'recent', page: 1 });

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display font-bold text-3xl">{t('incidentList.title')}</h1>

        <div className="flex flex-wrap gap-2 font-mono text-xs w-full sm:w-auto">
          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="flex-1 sm:flex-none min-w-[7.5rem] border border-line bg-paper px-2 py-1.5 uppercase"
          >
            {CATEGORY_VALUES.map((v) => (
              <option key={v} value={v}>{v === '' ? t('category.all') : t(`category.${v}`)}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="flex-1 sm:flex-none min-w-[7.5rem] border border-line bg-paper px-2 py-1.5 uppercase"
          >
            {STATUS_VALUES.map((v) => (
              <option key={v} value={v}>{v === '' ? t('status.all') : t(`status.${v}`)}</option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="flex-1 sm:flex-none min-w-[7.5rem] border border-line bg-paper px-2 py-1.5 uppercase"
          >
            <option value="recent">{t('incidentList.sortRecent')}</option>
            <option value="popular">{t('incidentList.sortPopular')}</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <IncidentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="border border-dashed border-line py-16 text-center">
          <p className="font-mono text-sm text-ink/50">{t('incidentList.empty')}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="scroll-panel max-h-[65vh] pr-2 border border-line bg-concrete-dark/30 p-2">
            <div className="space-y-3">
              {items.map((incident) => (
                <IncidentCard key={incident._id} incident={incident} />
              ))}
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6 font-mono text-sm">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1.5 border border-line disabled:opacity-30"
              >
                {t('incidentList.prev')}
              </button>
              <span className="px-3 py-1.5 text-ink/60">
                {t('incidentList.pageOf', { page: pagination.page, totalPages: pagination.totalPages })}
              </span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1.5 border border-line disabled:opacity-30"
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
