import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import VoteButton from './VoteButton';

function formatDate(iso, locale) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function IncidentCard({ incident }) {
  const { t, i18n } = useTranslation();
  const thumbnail = incident.images?.[0]?.url;

  return (
    <Link
      to={`/incidencias/${incident._id}`}
      className="group block bg-paper border border-line hover:border-petrol transition-colors"
    >
      <div className="flex">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-24 h-24 sm:w-28 sm:h-28 object-cover flex-shrink-0 grayscale-[15%]" />
        ) : (
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-concrete-dark flex items-center justify-center font-mono text-[10px] text-ink/40 uppercase tracking-wide text-center px-2">
            {t('incidentCard.noPhoto')}
          </div>
        )}

        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
                {t(`category.${incident.category}`, { defaultValue: incident.category })}
              </span>
              <StatusBadge status={incident.status} />
            </div>
            <h3 className="font-display font-semibold text-lg leading-tight truncate group-hover:text-signal transition-colors">
              {incident.title}
            </h3>
            <p className="text-sm text-ink/70 line-clamp-1">{incident.location?.address}</p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-ink/40">
              {formatDate(incident.createdAt, i18n.resolvedLanguage)}
            </span>
            <VoteButton
              incidentId={incident._id}
              initialVoted={incident.hasVoted}
              initialCount={incident.votesCount}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
