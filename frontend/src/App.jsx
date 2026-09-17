import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import HtmlLangSync from './components/HtmlLangSync';
import ProtectedRoute from './components/ProtectedRoute';
import IncidentListPage from './pages/IncidentListPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import CreateIncidentPage from './pages/CreateIncidentPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ModerationPage from './pages/ModerationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-concrete">
        <HtmlLangSync />
        <Navbar />
        <main>
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
