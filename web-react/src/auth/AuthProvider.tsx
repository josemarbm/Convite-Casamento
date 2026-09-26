import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, clearSession, hasSession, saveSession } from '../api/client';

type User = { id: number; username: string; email: string };
type AuthContextValue = { user: User | null; loading: boolean; login: (username: string, password: string) => Promise<void>; logout: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => JSON.parse(localStorage.getItem('user') ?? 'null'));
  const [loading, setLoading] = useState(hasSession());

  useEffect(() => {
    if (!hasSession()) return;
    apiRequest<User>('/auth/me').then(setUser).catch(() => { clearSession(); setUser(null); }).finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const result = await apiRequest<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    saveSession(result.token, result.user);
    setUser(result.user);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}