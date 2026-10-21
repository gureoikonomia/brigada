import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getIncident,
  deleteIncident,
  updateIncident,
  updateIncidentStatus,
} from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import StatusBadge from '../components/StatusBadge';
import VoteButton from '../components/VoteButton';
import ImageGallery from '../components/ImageGallery';
import IncidentDetailSkeleton from '../components/IncidentDetailSkeleton';
import styles from './IncidentDetailPage.module.css';

const STATUS_OPTIONS = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];
const CATEGORY_OPTIONS = ['infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'];

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
  const [statusSaving, setStatusSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editImages, setEditImages] = useState([]);
  const [actionError, setActionError] = useState(null);

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
    setActionError(null);
    try {
      await deleteIncident(id);
      navigate('/');
    } catch (err) {
      setDeleting(false);
      setActionError(err.response?.data?.message || t('incidentDetail.deleteError'));
    }
  };

  const handleStatusChange = async (status) => {
    setStatusSaving(true);
    setActionError(null);
    try {
      const updated = await updateIncidentStatus(id, status);
      setIncident((prev) => ({ ...prev, status: updated.status }));
    } catch (err) {
      setActionError(err.response?.data?.message || t('moderation.statusChangeError'));
    } finally {
      setStatusSaving(false);
    }
  };

  const startEditing = () => {
    setEditDraft({
      title: incident.title,
      description: incident.description,
      category: incident.category,
      address: incident.location?.address || '',
    });
    setEditImages([]);
    setEditError(null);
    setEditing(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setEditError(null);

    try {
      const updated = await updateIncident(id, editDraft, editImages);
      setIncident((previous) => ({
        ...previous,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        location: updated.location,
        images: updated.images,
      }));
      setEditing(false);
      setEditDraft(null);
      setEditImages([]);
    } catch (err) {
      setEditError(err.response?.data?.message || t('incidentDetail.editError'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditImagesChange = (event) => {
    const selectedImages = Array.from(event.target.files || []);
    event.target.value = '';
    setEditError(null);

    if (incident.images.length + selectedImages.length > 5) {
      setEditError(t('incidentDetail.editImagesLimit'));
      return;
    }

    const validImages = selectedImages.every((file) => (
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
      file.size <= 5 * 1024 * 1024
    ));
    if (!validImages) {
      setEditError(t('incidentDetail.editImagesInvalid'));
      return;
    }

    setEditImages(selectedImages);
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

  const isOwner = Boolean(user && (incident.isOwner || incident.createdBy?._id === user.id));
  const canModerate = user && ['admin', 'moderator'].includes(user.role);
  const canAdminister = user?.role === 'admin';
  const canDelete = user && user.role !== 'moderator' && (isOwner || canAdminister);
  const isInReview = incident.status === 'en_revision';
  const availableStatuses = canAdminister
    ? STATUS_OPTIONS
    : user?.role === 'moderator' && incident.status === 'en_revision'
      ? ['en_revision', 'pendiente', 'rechazada']
      : [incident.status];

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

          {editing && editDraft ? (
            <form onSubmit={handleEditSubmit} className={styles.editForm}>
              <div className={styles.editField}>
                <label htmlFor="incident-edit-title" className={styles.moderationLabel}>
                  {t('incidentDetail.editTitleLabel')}
                </label>
                <input
                  id="incident-edit-title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={editDraft.title}
                  onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                  className={styles.editInput}
                />
              </div>

              <div className={styles.editField}>
                <label htmlFor="incident-edit-description" className={styles.moderationLabel}>
                  {t('incidentDetail.editDescriptionLabel')}
                </label>
                <textarea
                  id="incident-edit-description"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  value={editDraft.description}
                  onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                  className={styles.editTextarea}
                />
              </div>

              <div className={styles.editField}>
                <label htmlFor="incident-edit-category" className={styles.moderationLabel}>
                  {t('incidentDetail.editCategoryLabel')}
                </label>
                <select
                  id="incident-edit-category"
                  value={editDraft.category}
                  onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })}
                  className={styles.statusSelect}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>{t(`category.${category}`)}</option>
                  ))}
                </select>
              </div>

              <div className={styles.editField}>
                <label htmlFor="incident-edit-address" className={styles.moderationLabel}>
                  {t('incidentDetail.editAddressLabel')}
                </label>
                <input
                  id="incident-edit-address"
                  type="text"
                  maxLength={300}
                  value={editDraft.address}
                  onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })}
                  className={styles.editInput}
                />
              </div>

              <div className={styles.editField}>
                <label htmlFor="incident-edit-images" className={styles.moderationLabel}>
                  {t('incidentDetail.addPhotosLabel')}
                </label>
                <p className={styles.editPhotoHint}>
                  {t('incidentDetail.addPhotosHint', {
                    current: incident.images.length,
                    remaining: 5 - incident.images.length,
                  })}
                </p>
                <input
                  id="incident-edit-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={incident.images.length >= 5}
                  onChange={handleEditImagesChange}
                  className={styles.editInput}
                />
                {editImages.length > 0 && (
                  <p className={styles.editPhotoHint} aria-live="polite">
                    {t('incidentDetail.newPhotosSelected', { count: editImages.length })}
                  </p>
                )}
              </div>

              {editError && <p className={styles.errorBox} role="alert">{editError}</p>}
              <div className={styles.editActions}>
                <button type="submit" disabled={savingEdit} className={styles.saveEditBtn}>
                  {savingEdit ? t('common.saving') : t('incidentDetail.saveEdit')}
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditing(false);
                    setEditDraft(null);
                    setEditImages([]);
                    setEditError(null);
                  }}
                  className={styles.cancelEditBtn}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className={styles.title}>{incident.title}</h1>

              <p className={styles.metaText}>
                <span className={styles.categoryTag} data-category={incident.category}>
                  {t(`category.${incident.category}`, { defaultValue: incident.category })}
                </span>
                {incident.location?.address ? ` · ${incident.location.address}` : ''} · {new Date(incident.createdAt).toLocaleDateString(i18n.resolvedLanguage)}{canModerate ? ' · ' : ''}
                {canModerate && (
                  <>{t('incidentDetail.reportedBy')} {incident.createdBy?.name || t('moderation.unknownUser')}</>
                )}
              </p>

              <p className={styles.description}>{incident.description}</p>
            </>
          )}
          {actionError && <p className={styles.errorBox} role="alert">{actionError}</p>}

          {(votingEnabled || canDelete || canAdminister) && !editing && (
            <div className={styles.actionsRow}>
              {votingEnabled && (
                <VoteButton
                  incidentId={incident._id}
                  initialVoted={incident.hasVoted}
                  initialCount={incident.votesCount}
                  size="lg"
                />
              )}

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={styles.deleteBtn}
                >
                  {deleting ? t('incidentDetail.deleting') : t('incidentDetail.deleteIncident')}
                </button>
              )}

              {canAdminister && (
                <button onClick={startEditing} className={styles.editBtn}>
                  {t('incidentDetail.editIncident')}
                </button>
              )}
            </div>
          )}

          {canModerate && (
            <div className={styles.moderationPanel}>
              <label htmlFor="incident-status" className={styles.moderationLabel}>
                {t('incidentDetail.moderationStatusLabel')}
              </label>
              <select
                id="incident-status"
                value={incident.status}
                disabled={statusSaving}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={styles.statusSelect}
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>{t(`status.${s}`)}</option>
                ))}
              </select>
              {statusSaving && <span className={styles.statusSaving}>{t('common.saving')}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
