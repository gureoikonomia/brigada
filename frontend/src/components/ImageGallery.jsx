import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ImageGallery.module.css';

export default function ImageGallery({ images }) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const active = images[activeIndex];

  return (
    <div>
      <img src={active.url} alt="" className={styles.activeImage} />

      {images.length > 1 && (
        <div className={styles.thumbnailsTrack}>
          {images.map((img, i) => (
            <button
              key={img.publicId || img.url}
              onClick={() => setActiveIndex(i)}
              aria-label={t('incidentDetail.viewPhoto', { n: i + 1, total: images.length })}
              aria-current={i === activeIndex}
              className={`${styles.thumbButton} ${
                i === activeIndex ? styles.thumbActive : styles.thumbInactive
              }`}
            >
              <img src={img.url} alt="" className={styles.thumbImage} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
