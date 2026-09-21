import { AuthProvider, useAuth } from './auth/AuthProvider';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RsvpPage from './pages/RsvpPage';
import './styles.css';

function Application() {
  const { user, loading } = useAuth();
  if (loading) return <main className="loading-page">Carregando...</main>;
  return user ? <DashboardPage /> : <LoginPage />;
}

export default function App() {
  const rsvpMatch = window.location.pathname.match(/^\/rsvp\/([^/]+)$/);
  if (rsvpMatch) return <RsvpPage token={decodeURIComponent(rsvpMatch[1])} />;
  return <AuthProvider><Application /></AuthProvider>;
}