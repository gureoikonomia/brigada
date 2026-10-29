import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import HtmlLangSync from './components/HtmlLangSync';
import ProtectedRoute from './components/ProtectedRoute';
const IncidentListPage = lazy(() => import('./pages/IncidentListPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const CreateIncidentPage = lazy(() => import('./pages/CreateIncidentPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
import styles from './App.module.css';

function SessionCheckNotice() {
  const { sessionCheckFailed } = useAuth();
  const { t } = useTranslation();

  if (!sessionCheckFailed) return null;
  return <p className={styles.sessionNotice} role="status">{t('auth.sessionCheckFailed')}</p>;
}

export default function App() {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <AppSettingsProvider>
        <div className={styles.appContainer}>
          <HtmlLangSync />
          <Navbar />
          <SessionCheckNotice />
          <main className={styles.mainContent}>
            <Suspense fallback={<div className={styles.loadingState} role="status">{t('common.loading')}</div>}>
              <Routes>
                <Route path="/" element={<IncidentListPage />} />
                <Route path="/incidencias/:id" element={<IncidentDetailPage />} />
                <Route
                  path="/incidencias/nueva"
                  element={
                    <ProtectedRoute>
                      <CreateIncidentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/perfil/editar" element={<Navigate to="/perfil?tab=settings" replace />} />
                <Route
                  path="/moderacion"
                  element={
                    <ProtectedRoute roles={['admin', 'moderator']}>
                      <Navigate to="/perfil?tab=moderation" replace />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
                <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
                <Route path="/recuperar-contrasena" element={<ResetPasswordPage />} />
                <Route path="/verificar-email" element={<VerifyEmailPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
