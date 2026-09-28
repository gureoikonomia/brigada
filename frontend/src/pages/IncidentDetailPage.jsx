import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getIncident, deleteIncident, updateIncidentStatus } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import StatusBadge from '../components/StatusBadge';
import VoteButton from '../components/VoteButton';
import ImageGallery from '../components/ImageGallery';
import IncidentDetailSkeleton from '../components/IncidentDetailSkeleton';
import styles from './IncidentDetailPage.module.css';

const STATUS_OPTIONS = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { votingEnabled } = useAppSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getIncident(id)
      .then((data) => {
        if (!cancelled) setIncident(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || t('incidentDetail.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, votingEnabled]);

  const handleDelete = async () => {
    if (!window.confirm(t('incidentDetail.confirmDelete'))) return;
    setDeleting(true);
    try {
      await deleteIncident(id);
      navigate('/');
    } catch {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (status) => {
    const updated = await updateIncidentStatus(id, status);
    setIncident((prev) => ({ ...prev, status: updated.status }));
  };

  if (loading) return <IncidentDetailSkeleton />;
  if (error || !incident) {
    return (
      <div className={styles.errorWrapper}>
        <Link to="/" className={styles.backLink}>
          {t('incidentDetail.backToList')}
        </Link>
        <div className={styles.errorNotice}>
          <p className={styles.errorNoticeTitle}>⚠️ {t('incidentDetail.notFound')}</p>
          <p className={styles.errorNoticeText}>{error || t('incidentDetail.pendingModerationNotice')}</p>
        </div>
      </div>
    );
  }

  const isOwner = user && incident.createdBy?._id === user.id;
  const canModerate = user && ['admin', 'moderator'].includes(user.role);
  const isInReview = incident.status === 'en_revision';

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>
        {t('incidentDetail.backToList')}
      </Link>

      {isInReview && (
        <div className={styles.inReviewBanner}>
          <span className={styles.inReviewDot}></span>
          <span>{t('incidentDetail.inReviewBanner')}</span>
        </div>
      )}

      <div className={styles.cardContainer}>
        <ImageGallery images={incident.images} />

        <div className={styles.cardBody}>
          <div className={styles.badgeRow}>
            <StatusBadge status={incident.status} />
          </div>

          <h1 className={styles.title}>{incident.title}</h1>

          <p className={styles.metaText}>
            <span className={styles.categoryTag} data-category={incident.category}>
              {t(`category.${incident.category}`, { defaultValue: incident.category })}
            </span>
            {incident.location?.address ? ` · ${incident.location.address}` : ''} · {new Date(incident.createdAt).toLocaleDateString(i18n.resolvedLanguage)} ·{' '}
            {t('incidentDetail.reportedBy')} {incident.createdBy?.name || 'usuario'}
          </p>

          <p className={styles.description}>{incident.description}</p>

          {(votingEnabled || isOwner || canModerate) && (
            <div className={styles.actionsRow}>
              {votingEnabled && (
                <VoteButton
                  incidentId={incident._id}
                  initialVoted={incident.hasVoted}
                  initialCount={incident.votesCount}
                  size="lg"
                />
              )}

              {(isOwner || canModerate) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={styles.deleteBtn}
              >
                {deleting ? t('incidentDetail.deleting') : t('incidentDetail.deleteIncident')}
              </button>
              )}
            </div>
          )}

          {canModerate && (
            <div className={styles.moderationPanel}>
              <label className={styles.moderationLabel}>
                {t('incidentDetail.moderationStatusLabel')}
              </label>
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={styles.statusSelect}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{t(`status.${s}`)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
