import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createIncident } from '../services/incident.service';
import styles from './CreateIncidentPage.module.css';

const CATEGORIES = ['infraestructura', 'seguridad', 'limpieza', 'ruido', 'trafico', 'otros'];

export default function CreateIncidentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'otros',
    lat: '',
    lng: '',
    address: '',
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      images.forEach((file) => formData.append('images', file));

      const incident = await createIncident(formData);
      navigate(`/incidencias/${incident._id}`);
    } catch (err) {
      setError(err.response?.data?.message || t('createIncident.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('createIncident.title')}</h1>
      <p className={styles.subtitle}>{t('createIncident.subtitle')}</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div>
          <label className={styles.label}>
            {t('createIncident.titleLabel')}
          </label>
          <input
            type="text"
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={styles.textInput}
          />
        </div>

        <div>
          <label className={styles.label}>
            {t('createIncident.descriptionLabel')}
          </label>
          <textarea
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={styles.textarea}
          />
        </div>

        <div>
          <label className={styles.label}>
            {t('createIncident.categoryLabel')}
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={styles.selectInput}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <div className={styles.locationHeader}>
            <label className={styles.label}>
              {t('createIncident.locationLabel')}
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className={styles.locateBtn}
            >
              {locating ? t('createIncident.locating') : t('createIncident.useMyLocation')}
            </button>
          </div>
          <div className={styles.coordsGrid}>
            <input
              type="number"
              step="any"
              required
              placeholder={t('createIncident.latPlaceholder')}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className={styles.coordInput}
            />
            <input
              type="number"
              step="any"
              required
              placeholder={t('createIncident.lngPlaceholder')}
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              className={styles.coordInput}
            />
          </div>
          <input
            type="text"
            placeholder={t('createIncident.addressPlaceholder')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={styles.addressInput}
          />
        </div>

        <div>
          <label className={styles.label}>
            {t('createIncident.photosLabel')} <span className={styles.photosHint}>{t('createIncident.photosHint')}</span>
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))}
            className={styles.fileInput}
          />
        </div>

        {error && (
          <p className={styles.errorBox}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={styles.submitBtn}
        >
          {submitting ? t('createIncident.submitting') : t('createIncident.submit')}
        </button>
      </form>
    </div>
  );
}
