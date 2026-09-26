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

export function getRsvpToken(pathname: string, search: string) {
  const pathMatch = pathname.match(/^\/rsvp\/([^/]+)$/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);
  if (pathname === '/rsvp.html') return new URLSearchParams(search).get('token');
  return null;
}

export default function App() {
  const rsvpToken = getRsvpToken(window.location.pathname, window.location.search);
  if (rsvpToken) return <RsvpPage token={rsvpToken} />;
  return <AuthProvider><Application /></AuthProvider>;
}