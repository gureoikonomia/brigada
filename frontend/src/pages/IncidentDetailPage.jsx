import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getIncident, deleteIncident, updateIncidentStatus } from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import VoteButton from '../components/VoteButton';
import ImageGallery from '../components/ImageGallery';
import IncidentDetailSkeleton from '../components/IncidentDetailSkeleton';

const STATUS_OPTIONS = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
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
      .catch(() => {
        if (!cancelled) setError(t('incidentDetail.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2 max-w-2xl mx-auto mt-8">
        {error || t('incidentDetail.notFound')}
      </p>
    );
  }

  const isOwner = user && incident.createdBy?._id === user.id;
  const canModerate = user && ['admin', 'moderator'].includes(user.role);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="font-mono text-xs text-ink/50 hover:text-signal">
        {t('incidentDetail.backToList')}
      </Link>

      <div className="bg-paper border border-line mt-4">
        <ImageGallery images={incident.images} />

        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink/50">
              {t(`category.${incident.category}`, { defaultValue: incident.category })}
            </span>
            <StatusBadge status={incident.status} />
          </div>

          <h1 className="font-display font-bold text-3xl mb-2">{incident.title}</h1>

          <p className="font-mono text-xs text-ink/50 mb-4">
            {incident.location?.address} · {new Date(incident.createdAt).toLocaleDateString(i18n.resolvedLanguage)} ·{' '}
            {t('incidentDetail.reportedBy')} {incident.createdBy?.name || 'usuario'}
          </p>

          <p className="text-ink/80 leading-relaxed whitespace-pre-line mb-6">{incident.description}</p>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-line">
            <VoteButton
              incidentId={incident._id}
              initialVoted={incident.hasVoted}
              initialCount={incident.votesCount}
              size="lg"
            />

            {(isOwner || canModerate) && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="font-mono text-xs uppercase text-warn border border-warn px-3 py-1.5 hover:bg-warn hover:text-white transition-colors disabled:opacity-50"
              >
                {deleting ? t('incidentDetail.deleting') : t('incidentDetail.deleteIncident')}
              </button>
            )}
          </div>

          {canModerate && (
            <div className="mt-4 pt-4 border-t border-line">
              <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
                {t('incidentDetail.moderationStatusLabel')}
              </label>
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="border border-line bg-white px-2 py-1.5 font-mono text-xs uppercase"
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
