import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-ink/60 font-mono text-sm">
        {t('common.loadingSession')}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto mt-16 border border-warn bg-warn/5 p-6 text-warn font-mono text-sm">
        {t('common.noPermission')}
      </div>
    );
  }

  return children;
}
