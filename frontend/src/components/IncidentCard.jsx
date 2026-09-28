import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAppSettings from '../hooks/useAppSettings';
import StatusBadge from './StatusBadge';
import VoteButton from './VoteButton';
import styles from './IncidentCard.module.css';

function formatDate(iso, locale) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function IncidentCard({ incident }) {
  const { t, i18n } = useTranslation();
  const { votingEnabled } = useAppSettings();
  const thumbnail = incident.images?.[0]?.url;

  return (
    <Link
      to={`/incidencias/${incident._id}`}
      className={`group ${styles.cardLink}`}
    >
      <div className={styles.cardContainer}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className={styles.thumbnailImage} />
        ) : (
          <div className={styles.noPhotoBox}>
            {t('incidentCard.noPhoto')}
          </div>
        )}

        <div className={styles.cardContent}>
          <div className={styles.mainContent}>
            <div className={styles.titleRow}>
              <h3 className={styles.cardTitle}>{incident.title}</h3>
              <StatusBadge status={incident.status} />
            </div>
            {incident.location?.address && (
              <p className={styles.cardAddress}>{incident.location.address}</p>
            )}
          </div>

          <div className={styles.footerRow}>
            <div className={styles.footerMeta}>
              <span className={styles.categoryTag} data-category={incident.category}>
                {t(`category.${incident.category}`, { defaultValue: incident.category })}
              </span>
              <span className={styles.cardDate}>
                {formatDate(incident.createdAt, i18n.resolvedLanguage)}
              </span>
            </div>
            {votingEnabled && (
              <VoteButton
                incidentId={incident._id}
                initialVoted={incident.hasVoted}
                initialCount={incident.votesCount}
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
