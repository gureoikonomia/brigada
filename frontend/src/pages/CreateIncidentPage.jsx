import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createIncident } from '../services/incident.service';

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
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl mb-1">{t('createIncident.title')}</h1>
      <p className="text-ink/60 text-sm mb-6">{t('createIncident.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('createIncident.titleLabel')}
          </label>
          <input
            type="text"
            required
            maxLength={150}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 focus:border-signal outline-none"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('createIncident.descriptionLabel')}
          </label>
          <textarea
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 focus:border-signal outline-none resize-none"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('createIncident.categoryLabel')}
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 uppercase font-mono text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-mono text-xs uppercase tracking-wide text-ink/60">
              {t('createIncident.locationLabel')}
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="font-mono text-[11px] text-petrol hover:text-signal underline disabled:opacity-50"
            >
              {locating ? t('createIncident.locating') : t('createIncident.useMyLocation')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              required
              placeholder={t('createIncident.latPlaceholder')}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className="border border-line bg-paper px-3 py-2 focus:border-signal outline-none font-mono text-sm"
            />
            <input
              type="number"
              step="any"
              required
              placeholder={t('createIncident.lngPlaceholder')}
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              className="border border-line bg-paper px-3 py-2 focus:border-signal outline-none font-mono text-sm"
            />
          </div>
          <input
            type="text"
            placeholder={t('createIncident.addressPlaceholder')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-line bg-paper px-3 py-2 mt-2 focus:border-signal outline-none"
          />
        </div>

        <div>
          <label className="block font-mono text-xs uppercase tracking-wide text-ink/60 mb-1">
            {t('createIncident.photosLabel')} <span className="text-ink/40">{t('createIncident.photosHint')}</span>
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))}
            className="w-full font-mono text-sm"
          />
        </div>

        {error && (
          <p className="text-warn text-sm font-mono border border-warn bg-warn/5 px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-signal hover:bg-signal-dark text-white font-mono font-medium py-2.5 disabled:opacity-60 transition-colors"
        >
          {submitting ? t('createIncident.submitting') : t('createIncident.submit')}
        </button>
      </form>
    </div>
  );
}
