import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { listIncidents } from '../services/incident.service';
import IncidentCard from '../components/IncidentCard';
import IncidentCardSkeleton from '../components/IncidentCardSkeleton';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    listIncidents({ createdBy: user.id, sortBy: 'recent' })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError(t('profile.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 bg-paper border border-line p-6 mb-8">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 flex-shrink-0 bg-petrol text-white font-display font-bold text-xl flex items-center justify-center">
            {initials(user.name) || '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-2xl truncate">{user.name}</h1>
          <p className="text-ink/60 text-sm truncate">{user.email}</p>
          <span className="inline-block mt-1 font-mono text-[11px] uppercase tracking-wide text-petrol border border-petrol px-1.5 py-0.5">
            {t(`role.${user.role}`, { defaultValue: user.role })}
          </span>
        </div>

        <Link
          to="/perfil/editar"
          className="font-mono text-xs uppercase text-petrol border border-petrol px-3 py-1.5 hover:bg-petrol hover:text-white transition-colors flex-shrink-0"
        >
          {t('profile.edit')}
        </Link>
      </div>

      <h2 className="font-display font-bold text-xl mb-4">{t('profile.yourIncidents')}</h2>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <IncidentCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="border border-dashed border-line py-12 text-center">
          <p className="font-mono text-sm text-ink/50">{t('profile.empty')}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="scroll-panel max-h-[50vh] pr-2 border border-line bg-concrete-dark/30 p-2">
          <div className="space-y-3">
            {items.map((incident) => (
              <IncidentCard key={incident._id} incident={incident} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
