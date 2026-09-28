import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from './ProtectedRoute.module.css';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        {t('common.loadingSession')}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className={styles.forbiddenBox}>
        {t('common.noPermission')}
      </div>
    );
  }

  return children;
}
