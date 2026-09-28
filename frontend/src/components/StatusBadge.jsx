import { useTranslation } from 'react-i18next';
import styles from './StatusBadge.module.css';

const STATUS_COLORS = {
  pendiente: { color: 'var(--color-status-pending)', bg: 'var(--color-status-pending-bg)' },
  en_revision: { color: 'var(--color-status-review)', bg: 'var(--color-status-review-bg)' },
  resuelta: { color: 'var(--color-status-resolved)', bg: 'var(--color-status-resolved-bg)' },
  rechazada: { color: 'var(--color-status-rejected)', bg: 'var(--color-status-rejected-bg)' },
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pendiente;
  const label = t(`status.${status}`, { defaultValue: t('status.pendiente') });

  return (
    <span
      className={styles.badge}
      style={{ color: colors.color, backgroundColor: colors.bg, borderColor: colors.color }}
    >
      <span className={styles.indicatorDot} style={{ backgroundColor: colors.color }} />
      {label}
    </span>
  );
}
