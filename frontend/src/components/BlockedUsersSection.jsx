import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listBlockedUsers, unblockUser } from '../services/user.service';
import styles from '../pages/ProfilePage.module.css';

export default function BlockedUsersSection() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listBlockedUsers()
      .then((result) => {
        if (!cancelled) setUsers(result);
      })
      .catch(() => {
        if (!cancelled) setError(t('profile.blockedUsersLoadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleUnblock = async (id) => {
    setUnblockingId(id);
    setError(null);
    try {
      await unblockUser(id);
      setUsers((current) => current.filter((user) => user._id !== id));
    } catch {
      setError(t('profile.unblockUserError'));
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <section className={styles.sectionCard}>
      <h3 className={styles.subSectionTitle}>{t('profile.blockedUsersTitle')}</h3>
      <p className={styles.emailChangeDescription}>{t('profile.blockedUsersDescription')}</p>
      {loading && <p className={styles.emptyText}>{t('common.loading')}</p>}
      {error && <p className={styles.formError} role="alert">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <p className={styles.emptyText}>{t('profile.noBlockedUsers')}</p>
      )}
      {users.length > 0 && (
        <ul className={styles.blockedUsersList}>
          {users.map((user) => (
            <li key={user._id} className={styles.blockedUserItem}>
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => handleUnblock(user._id)}
                disabled={unblockingId === user._id}
                className={styles.unblockButton}
              >
                {unblockingId === user._id ? t('profile.unblockingUser') : t('profile.unblockUser')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
