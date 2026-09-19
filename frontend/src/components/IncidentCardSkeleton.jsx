import styles from './IncidentCardSkeleton.module.css';

export default function IncidentCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.thumbBox} />
      <div className={styles.contentBox}>
        <div>
          <div className={styles.headerRow}>
            <div className={styles.lineCategory} />
            <div className={styles.lineBadge} />
          </div>
          <div className={styles.lineTitle} />
          <div className={styles.lineAddress} />
        </div>
        <div className={styles.footerRow}>
          <div className={styles.lineDate} />
          <div className={styles.lineButton} />
        </div>
      </div>
    </div>
  );
}
