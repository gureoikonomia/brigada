import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { createIncident } from '../services/incident.service';
import styles from './CreateIncidentPage.module.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_MAP_CENTER = [42.8, -2.5];

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });
  return null;
}

function MapPosition({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    }
  }, [map, lat, lng]);

  return null;
}

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
  const [locationError, setLocationError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const position = form.lat && form.lng
    ? [Number(form.lat), Number(form.lng)]
    : null;

  const selectLocation = ({ lat, lng }) => {
    setForm((current) => ({
      ...current,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    }));
    setLocationError(null);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('createIncident.locationUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError(t('createIncident.locationUnavailable'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddressSearch = async () => {
    const address = form.address.trim();
    if (!address) {
      setLocationError(t('createIncident.addressRequired'));
      return;
    }

    setSearchingAddress(true);
    setLocationError(null);
    try {
      const params = new URLSearchParams({ q: address, format: 'jsonv2', limit: '1' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Geocoding failed');
      const [result] = await response.json();
      if (!result) {
        setLocationError(t('createIncident.addressNotFound'));
        return;
      }
      selectLocation({ lat: Number(result.lat), lng: Number(result.lon) });
    } catch {
      setLocationError(t('createIncident.locationUnavailable'));
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lat || !form.lng) {
      setLocationError(t('createIncident.locationRequired'));
      return;
    }
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
          <div className={styles.addressSearch}>
            <input
              type="text"
              placeholder={t('createIncident.addressPlaceholder')}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={styles.addressInput}
            />
            <button
              type="button"
              onClick={handleAddressSearch}
              disabled={searchingAddress}
              className={styles.searchAddressBtn}
            >
              {searchingAddress ? t('createIncident.searchingAddress') : t('createIncident.searchAddress')}
            </button>
          </div>
          <p className={styles.locationHint}>{t('createIncident.locationHint')}</p>
          <MapContainer
            center={position || DEFAULT_MAP_CENTER}
            zoom={position ? 15 : 7}
            className={styles.map}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={selectLocation} />
            <MapPosition lat={position?.[0]} lng={position?.[1]} />
            {position && <Marker position={position} />}
          </MapContainer>
          {position && <p className={styles.locationSelected}>{t('createIncident.locationSelected')}</p>}
          {locationError && <p className={styles.locationError}>{locationError}</p>}
        </div>

        <div className={styles.photoSection}>
          <label className={styles.label} htmlFor="incident-photos">
            {t('createIncident.photosLabel')} <span className={styles.photosHint}>{t('createIncident.photosHint')}</span>
          </label>
          <div className={styles.photoPickerWrap}>
            <input
              id="incident-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-describedby="incident-photo-status"
              onChange={(e) => setImages(Array.from(e.target.files).slice(0, 5))}
              className={styles.fileInput}
            />
            <label htmlFor="incident-photos" className={styles.photoPicker}>
              {t('createIncident.choosePhotos')}
            </label>
          </div>
          <p id="incident-photo-status" className={styles.fileSelectionStatus} aria-live="polite">
            {images.length
              ? t('createIncident.photosSelected', { count: images.length })
              : t('createIncident.noPhotosSelected')}
          </p>
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
