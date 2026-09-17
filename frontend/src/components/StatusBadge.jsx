import { useTranslation } from 'react-i18next';

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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-xs uppercase tracking-wide border"
      style={{ color: colors.color, backgroundColor: colors.bg, borderColor: colors.color }}
    >
      <span className="w-1.5 h-1.5" style={{ backgroundColor: colors.color }} />
      {label}
    </span>
  );
}
