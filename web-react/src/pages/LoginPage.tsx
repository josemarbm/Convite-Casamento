import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try { await login(username, password); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível entrar.'); } finally { setSubmitting(false); }
  }

  return <main className="login-page"><form className="login-panel" onSubmit={submit}>
    <p className="eyebrow">Gabriela & Josemar</p>
    <h1>Convites de casamento</h1>
    <p className="muted">Entre para organizar convidados, mensagens e confirmações.</p>
    {error && <p className="error">{error}</p>}
    <label>Usuário<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
    <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    <button className="primary-button" disabled={submitting}>{submitting ? 'Entrando...' : 'Entrar'}</button>
  </form></main>;
}