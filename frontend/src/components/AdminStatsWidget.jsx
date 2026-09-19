import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAdminStats } from '../services/user.service';
import styles from './AdminStatsWidget.module.css';

export default function AdminStatsWidget() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Error al cargar estadísticas de admin');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.skeletonWidget}>
        <div className={styles.skeletonHeader}></div>
        <div className={styles.skeletonGrid}>
          <div className={styles.skeletonBox}></div>
          <div className={styles.skeletonBox}></div>
          <div className={styles.skeletonBox}></div>
          <div className={styles.skeletonBox}></div>
        </div>
      </div>
    );
  }

  if (error || !stats) return null;

  const pendingCount = stats.incidents?.byStatus?.pendiente || 0;
  const inReviewCount = stats.incidents?.byStatus?.en_revision || 0;
  const resolvedCount = stats.incidents?.byStatus?.resuelta || 0;
  const totalIncidents = stats.incidents?.total || 0;

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.widgetHeader}>
        <div className={styles.headerTitleBox}>
          <span className={styles.pingDot}></span>
          <h3 className={styles.title}>
            {t('admin.title')}
          </h3>
        </div>
        <span className={styles.badge}>
          PANEL CONTROL ADMIN
        </span>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('admin.usersTotal')}</span>
          <span className={styles.statValue}>
            {stats.users?.total || 0}
          </span>
          <span className={styles.statSubtext}>
            ({stats.users?.active || 0} activos)
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('admin.incidentsTotal')}</span>
          <span className={styles.statValueInk}>
            {totalIncidents}
          </span>
          <span className={styles.statSubtextHighlight}>
            {pendingCount} pendientes
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('admin.totalVotes')}</span>
          <span className={styles.statValue}>
            {stats.totalVotes || 0}
          </span>
          <span className={styles.statSubtext}>apoyos en comunidad</span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Resueltas</span>
          <span className={styles.statValueSuccess}>
            {resolvedCount}
          </span>
          <span className={styles.statSubtext}>
            ({totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Desglose de estados */}
      <div className={styles.breakdownSection}>
        <div className={styles.breakdownLabelRow}>
          <span>Estado general de la plataforma:</span>
          <span>
            {pendingCount} pendientes · {inReviewCount} en revisión · {resolvedCount} resueltas
          </span>
        </div>
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressPending}
            style={{ width: `${totalIncidents ? (pendingCount / totalIncidents) * 100 : 0}%` }}
            title={`Pendientes: ${pendingCount}`}
          ></div>
          <div
            className={styles.progressReview}
            style={{ width: `${totalIncidents ? (inReviewCount / totalIncidents) * 100 : 0}%` }}
            title={`En revisión: ${inReviewCount}`}
          ></div>
          <div
            className={styles.progressResolved}
            style={{ width: `${totalIncidents ? (resolvedCount / totalIncidents) * 100 : 0}%` }}
            title={`Resueltas: ${resolvedCount}`}
          ></div>
        </div>
      </div>
    </div>
  );
}
