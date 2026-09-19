import styles from './IncidentDetailSkeleton.module.css';

export default function IncidentDetailSkeleton() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.lineTopNav} />

      <div className={styles.cardContainer}>
        <div className={styles.imagePlaceholder} />

        <div className={styles.contentBody}>
          <div className={styles.badgeRow}>
            <div className={styles.lineCategory} />
            <div className={styles.lineBadge} />
          </div>
          <div className={styles.lineTitle} />
          <div className={styles.lineAddress} />
          <div className={styles.textLines}>
            <div className={styles.lineFull} />
            <div className={styles.lineFull} />
            <div className={styles.lineShort} />
          </div>
          <div className={styles.buttonPlaceholder} />
        </div>
      </div>
    </div>
  );
}
