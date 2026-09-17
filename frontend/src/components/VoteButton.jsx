import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { voteIncident, unvoteIncident } from '../services/incident.service';
import { useNavigate } from 'react-router-dom';

export default function VoteButton({ incidentId, initialVoted, initialCount, size = 'md' }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }
    if (busy) return;

    setBusy(true);
    const prevVoted = voted;
    const prevCount = count;
    setVoted(!voted);
    setCount(voted ? count - 1 : count + 1);

    try {
      if (prevVoted) {
        await unvoteIncident(incidentId);
      } else {
        await voteIncident(incidentId);
      }
    } catch {
      setVoted(prevVoted);
      setCount(prevCount);
    } finally {
      setBusy(false);
    }
  };

  const sizeClasses = size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm';

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-pressed={voted}
      className={`font-mono font-medium border transition-colors disabled:opacity-60 ${sizeClasses} ${
        voted
          ? 'bg-signal text-white border-signal'
          : 'bg-transparent text-petrol border-petrol hover:bg-petrol hover:text-white'
      }`}
    >
      {voted ? t('vote.voted') : t('vote.support')} · {count}
    </button>
  );
}
