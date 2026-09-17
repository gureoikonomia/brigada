import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ImageGallery({ images }) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const active = images[activeIndex];

  return (
    <div>
      <img src={active.url} alt="" className="w-full h-64 object-cover" />

      {images.length > 1 && (
        <div className="flex gap-1 p-1 bg-concrete-dark">
          {images.map((img, i) => (
            <button
              key={img.publicId || img.url}
              onClick={() => setActiveIndex(i)}
              aria-label={t('incidentDetail.viewPhoto', { n: i + 1, total: images.length })}
              aria-current={i === activeIndex}
              className={`flex-1 h-14 overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-signal' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
