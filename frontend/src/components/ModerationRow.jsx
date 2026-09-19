import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateIncidentStatus, deleteIncident } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import styles from './ModerationRow.module.css';

const STATUS_STEPS = [
  { value: 'pendiente', color: '#8A7B4F' },
  { value: 'en_revision', color: '#1B3A4B' },
  { value: 'resuelta', color: '#2F6D4F' },
  { value: 'rechazada', color: '#B3261E' },
];

export default function ModerationRow({ incident, onChanged, onDeleted, allowedStatuses }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
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
    } catch (err) {
      setStatus(prev);
      setError(err?.response?.data?.message || t('moderation.statusChangeError'));
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

  const isModerator = user?.role === 'moderator';

  // Determinar los estados que se pueden seleccionar
  const availableSteps = STATUS_STEPS.filter((s) => {
    if (allowedStatuses && Array.isArray(allowedStatuses)) {
      return allowedStatuses.includes(s.value) || s.value === status;
    }
    if (isModerator) {
      if (status === 'en_revision') return ['pendiente', 'rechazada', 'en_revision'].includes(s.value);
      if (status === 'pendiente') return ['en_revision', 'rechazada', 'pendiente'].includes(s.value);
    }
    return true; // Admin ve todos
  });

  return (
    <div className={styles.rowContainer}>
      <div className={styles.contentBox}>
        <Link to={`/incidencias/${incident._id}`} className={styles.titleLink}>
          {incident.title}
        </Link>
        <p className={styles.metaText}>
          {t('moderation.rowMeta', { author: incident.createdBy?.name || 'usuario', date: formatDate(incident.createdAt) })}
          {' · '}
          {t('moderation.votesCount', { count: incident.votesCount })}
          {incident.location?.address ? ` · ${incident.location.address}` : ''}
        </p>
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      <div className={styles.actionsGroup}>
        {availableSteps.map((s) => (
          <button
            key={s.value}
            disabled={busy || status === s.value}
            onClick={() => handleStatusChange(s.value)}
            aria-pressed={status === s.value}
            className={styles.statusBtn}
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
          className={styles.deleteBtn}
        >
          {t('moderation.delete')}
        </button>
      </div>
    </div>
  );
}
