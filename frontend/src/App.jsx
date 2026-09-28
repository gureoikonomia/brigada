import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import Navbar from './components/Navbar';
import HtmlLangSync from './components/HtmlLangSync';
import ProtectedRoute from './components/ProtectedRoute';
import IncidentListPage from './pages/IncidentListPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
const CreateIncidentPage = lazy(() => import('./pages/CreateIncidentPage'));
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ModerationPage from './pages/ModerationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import styles from './App.module.css';

export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <div className={styles.appContainer}>
          <HtmlLangSync />
          <Navbar />
          <main className={styles.mainContent}>
            <Routes>
            <Route path="/" element={<IncidentListPage />} />
            <Route path="/incidencias/:id" element={<IncidentDetailPage />} />
            <Route
              path="/incidencias/nueva"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className={styles.loadingState}>Cargando…</div>}>
                    <CreateIncidentPage />
                  </Suspense>
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
            <Route
              path="/perfil/editar"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderacion"
              element={
                <ProtectedRoute roles={['admin', 'moderator']}>
                  <ModerationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/recuperar-contrasena" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
