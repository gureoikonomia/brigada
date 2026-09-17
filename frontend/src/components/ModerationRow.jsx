import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateIncidentStatus, deleteIncident } from '../services/incident.service';

const STATUS_STEPS = [
  { value: 'pendiente', color: '#8A7B4F' },
  { value: 'en_revision', color: '#1B3A4B' },
  { value: 'resuelta', color: '#2F6D4F' },
  { value: 'rechazada', color: '#B3261E' },
];

export default function ModerationRow({ incident, onChanged, onDeleted }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(incident.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(i18n.resolvedLanguage, { day: '2-digit', month: 'short' });

  const handleStatusChange = async (newStatus) => {
    if (newStatus === status || busy) return;
    setBusy(true);
    setError(null);
    const prev = status;
    setStatus(newStatus);

    try {
      await updateIncidentStatus(incident._id, newStatus);
      onChanged?.(incident._id, newStatus);
    } catch {
      setStatus(prev);
      setError(t('moderation.statusChangeError'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('moderation.confirmDelete', { title: incident.title }))) return;
    setBusy(true);
    try {
      await deleteIncident(incident._id);
      onDeleted?.(incident._id);
    } catch {
      setError(t('moderation.deleteError'));
      setBusy(false);
    }
  };

  return (
    <div className="bg-paper border border-line p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Link to={`/incidencias/${incident._id}`} className="font-medium hover:text-signal truncate block">
          {incident.title}
        </Link>
        <p className="font-mono text-[11px] text-ink/50 truncate">
          {t('moderation.rowMeta', { author: incident.createdBy?.name || 'usuario', date: formatDate(incident.createdAt) })}
          {' · '}
          {t('moderation.votesCount', { count: incident.votesCount })}
          {incident.location?.address ? ` · ${incident.location.address}` : ''}
        </p>
        {error && <p className="font-mono text-[11px] text-warn mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_STEPS.map((s) => (
          <button
            key={s.value}
            disabled={busy}
            onClick={() => handleStatusChange(s.value)}
            aria-pressed={status === s.value}
            className="font-mono text-[10px] uppercase px-2 py-1 border transition-colors disabled:opacity-50"
            style={
              status === s.value
                ? { backgroundColor: s.color, borderColor: s.color, color: 'white' }
                : { borderColor: s.color, color: s.color, backgroundColor: 'transparent' }
            }
          >
            {t(`status.${s.value}`)}
          </button>
        ))}

        <button
          disabled={busy}
          onClick={handleDelete}
          className="font-mono text-[10px] uppercase px-2 py-1 border border-warn text-warn hover:bg-warn hover:text-white transition-colors disabled:opacity-50 ml-1"
        >
          {t('moderation.delete')}
        </button>
      </div>
    </div>
  );
}
