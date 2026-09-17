import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incident.service';
import ModerationRow from '../components/ModerationRow';

const TAB_VALUES = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];
const TAB_KEYS = {
  pendiente: 'moderation.tabPending',
  en_revision: 'moderation.tabInReview',
  resuelta: 'moderation.tabResolved',
  rechazada: 'moderation.tabRejected',
};

export default function ModerationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pendiente');
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
  }, [activeTab]);

  const handleChanged = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleDeleted = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl mb-1">{t('moderation.title')}</h1>
      <p className="text-ink/60 text-sm mb-6">{t('moderation.subtitle')}</p>

      <div className="flex gap-1 mb-4 font-mono text-xs border-b border-line">
        {TAB_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-3 py-2 uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              activeTab === value
                ? 'border-signal text-signal'
                : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t(TAB_KEYS[value])}
          </button>
        ))}
      </div>

      {loading && <p className="font-mono text-sm text-ink/50 py-12 text-center">{t('common.loading')}</p>}

      {error && (
        <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="border border-dashed border-line py-16 text-center">
          <p className="font-mono text-sm text-ink/50">{t('moderation.empty')}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="scroll-panel max-h-[65vh] pr-2 border border-line bg-concrete-dark/30 p-2">
          <div className="space-y-2">
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
    </div>
  );
}
