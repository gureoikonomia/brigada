import { useTranslation } from 'react-i18next';
import styles from './StatusBadge.module.css';

const STATUS_COLORS = {
  pendiente: { color: '#8A7B4F', bg: '#F1ECD8' },
  en_revision: { color: '#1B3A4B', bg: '#DCE7EC' },
  resuelta: { color: '#2F6D4F', bg: '#DCEDE3' },
  rechazada: { color: '#B3261E', bg: '#F6DFDC' },
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
