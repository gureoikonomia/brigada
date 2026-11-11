import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  listIncidents,
  listPendingIncidentReports,
  resolveIncidentReport,
} from '../services/incident.service';
import { useAuth } from '../context/AuthContext';
import useAppSettings from '../hooks/useAppSettings';
import ModerationRow from '../components/ModerationRow';
import styles from './ModerationPage.module.css';

const TAB_VALUES = ['pendiente', 'en_revision', 'resuelta', 'rechazada'];
const TAB_KEYS = {
  pendiente: 'moderation.tabPending',
  en_revision: 'moderation.tabInReview',
  resuelta: 'moderation.tabResolved',
  rechazada: 'moderation.tabRejected',
  reports: 'moderation.tabReports',
};

export default function ModerationPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { votingEnabled } = useAppSettings();
  const isModerator = user?.role === 'moderator';
  const tabValues = isModerator ? ['en_revision', 'reports'] : [...TAB_VALUES, 'reports'];
  const [activeTab, setActiveTab] = useState(isModerator ? 'en_revision' : 'pendiente');
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = activeTab === 'reports'
      ? listPendingIncidentReports().then((data) => {
        if (!cancelled) setReports(data);
      })
      : listIncidents({ status: activeTab, sortBy: 'recent', limit: 50 }).then((data) => {
        if (!cancelled) {
          setItems(data.items.filter((incident) => incident.status === activeTab));
        }
      });

    request
      .catch(() => {
        if (!cancelled) setError(t('moderation.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, votingEnabled]);

  const handleChanged = (id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  };

  const handleReportResolution = async (id, status) => {
    setResolvingReportId(id);
    setError(null);
    try {
      await resolveIncidentReport(id, status);
      setReports((current) => current.filter((report) => report._id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('moderation.reportActionError'));
    } finally {
      setResolvingReportId(null);
    }
  };

  return (
    <div className={`${styles.container} ${styles.embedded}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('moderation.title')}</h2>
        <p className={styles.subtitle}>
          {activeTab === 'reports'
            ? t('moderation.reportsSubtitle')
            : isModerator ? t('moderation.moderatorSubtitle') : t('moderation.subtitle')}
        </p>
      </div>

      <div className={styles.tabsRow}>
        {tabValues.map((value) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            aria-pressed={activeTab === value}
            className={`${styles.tabBtn} ${
              activeTab === value ? styles.tabActive : styles.tabInactive
            }`}
          >
            {t(TAB_KEYS[value])}
          </button>
        ))}
      </div>

      {loading && <p className={styles.loadingText}>{t('common.loading')}</p>}

      {error && (
        <p className={styles.errorBox}>{error}</p>
      )}

      {!loading && !error && (activeTab === 'reports' ? reports.length === 0 : items.length === 0) && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            {activeTab === 'reports'
              ? t('moderation.reportsEmpty')
              : isModerator ? t('moderation.moderatorEmpty') : t('moderation.empty')}
          </p>
        </div>
      )}

      {!loading && activeTab === 'reports' && reports.length > 0 && (
        <div className={styles.reportList}>
          {reports.map((report) => (
            <article key={report._id} className={styles.reportCard}>
              <h3 className={styles.reportTitle}>
                <Link to={`/incidencias/${report.incident._id}`}>
                  {report.incident.title}
                </Link>
              </h3>
              <p className={styles.reportMeta}>
                {t(`incidentDetail.reportReasons.${report.reason}`)}
                {' · '}
                {t('moderation.reportedBy', { name: report.reporter?.name || t('moderation.unknownUser') })}
              </p>
              {report.details && <p className={styles.reportDetails}>{report.details}</p>}
              <p className={styles.reportMeta}>
                {t('moderation.incidentStatus', { status: t(`status.${report.incident.status}`) })}
              </p>
              <div className={styles.reportActions}>
                <button
                  type="button"
                  disabled={resolvingReportId === report._id}
                  onClick={() => handleReportResolution(report._id, 'actioned')}
                  className={styles.reportActionButton}
                >
                  {t('moderation.markActioned')}
                </button>
                <button
                  type="button"
                  disabled={resolvingReportId === report._id}
                  onClick={() => handleReportResolution(report._id, 'dismissed')}
                  className={styles.reportActionButton}
                >
                  {t('moderation.dismissReport')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && activeTab !== 'reports' && items.length > 0 && (
        <div className={styles.listPanel}>
          <div className={styles.itemsSpace}>
            {items.map((incident) => (
              <ModerationRow
                key={incident._id}
                incident={incident}
                onChanged={handleChanged}
                allowedStatuses={isModerator ? ['pendiente', 'rechazada'] : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
