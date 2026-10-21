import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateIncidentStatus } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import styles from './ModerationRow.module.css';

const STATUS_STEPS = [
  { value: 'pendiente' },
  { value: 'en_revision' },
  { value: 'resuelta' },
  { value: 'rechazada' },
];

export default function ModerationRow({ incident, onChanged, allowedStatuses }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { votingEnabled } = useAppSettings();
  const [status, setStatus] = useState(incident.status);
  const [selectedStatus, setSelectedStatus] = useState(incident.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(i18n.resolvedLanguage, { day: '2-digit', month: 'short' });

  const handleStatusChange = async () => {
    const newStatus = selectedStatus;
    if (newStatus === status || busy) return;
    setBusy(true);
    setError(null);
    const prev = status;

    try {
      await updateIncidentStatus(incident._id, newStatus);
      setStatus(newStatus);
      onChanged?.(incident._id, newStatus);
    } catch (err) {
      setStatus(prev);
      setSelectedStatus(prev);
      setError(err?.response?.data?.message || t('moderation.statusChangeError'));
    } finally {
      setBusy(false);
    }
  };

  const isModerator = user?.role === 'moderator';
  const metaParts = [
    t('moderation.rowMeta', {
      author: incident.createdBy?.name || t('moderation.unknownUser'),
      date: formatDate(incident.createdAt),
    }),
  ];
  if (votingEnabled) metaParts.push(t('moderation.votesCount', { count: incident.votesCount }));
  if (incident.location?.address) metaParts.push(incident.location.address);

  const availableSteps = STATUS_STEPS.filter((s) => {
    if (allowedStatuses && Array.isArray(allowedStatuses)) {
      return allowedStatuses.includes(s.value) || s.value === status;
    }
    if (isModerator && status === 'en_revision') return ['pendiente', 'rechazada', 'en_revision'].includes(s.value);
    return user?.role === 'admin' || s.value === status;
  });

  return (
    <div className={styles.rowContainer}>
      <div className={styles.contentBox}>
        <Link to={`/incidencias/${incident._id}`} className={styles.titleLink}>
          {incident.title}
        </Link>
        <p className={styles.metaText}>
          {metaParts.join(' · ')}
        </p>
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      <div className={styles.actionsGroup}>
        <label className={styles.statusField}>
          <span className="sr-only">{t('moderation.selectStatusFor', { title: incident.title })}</span>
          <select
            value={selectedStatus}
            disabled={busy || availableSteps.length < 2}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className={styles.statusSelect}
          >
            {availableSteps.map((step) => (
              <option key={step.value} value={step.value}>
                {t(`status.${step.value}`)}
              </option>
            ))}
          </select>
        </label>

        {availableSteps.length > 1 && (
          <button
            disabled={busy || selectedStatus === status}
            onClick={handleStatusChange}
            className={styles.statusBtn}
          >
            {busy ? t('common.saving') : t('moderation.updateStatus')}
          </button>
        )}

      </div>
    </div>
  );
}
