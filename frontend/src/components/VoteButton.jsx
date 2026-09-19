import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { voteIncident, unvoteIncident } from '../services/incident.service';
import { useNavigate } from 'react-router-dom';
import styles from './VoteButton.module.css';

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

  const sizeClass = size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const stateClass = voted ? styles.voted : styles.notVoted;

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-pressed={voted}
      className={`${styles.voteBtn} ${sizeClass} ${stateClass}`}
    >
      {voted ? t('vote.voted') : t('vote.support')} · {count}
    </button>
  );
}
