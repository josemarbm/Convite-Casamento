import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '../api/client';

type Rsvp = { name: string; status: 'pending' | 'confirmed' | 'declined'; responded_at: string | null };

export default function RsvpPage({ token }: { token: string }) {
  const [rsvp, setRsvp] = useState<Rsvp | null>(null);
  const [message, setMessage] = useState('Carregando convite...');
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiRequest<Rsvp>(`/rsvp/${encodeURIComponent(token)}`).then(setRsvp).catch((error) => setMessage(error instanceof ApiError ? error.message : 'Convite indisponível.')); }, [token]);

  async function answer(response: 'confirmed' | 'declined') {
    setSaving(true);
    try { setRsvp(await apiRequest<Rsvp>(`/rsvp/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ response }) })); } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Não foi possível registrar sua resposta.'); } finally { setSaving(false); }
  }

  return <main className="login-page"><section className="login-panel rsvp-panel"><p className="eyebrow">Gabriela & Josemar</p><h1>Confirmação de presença</h1>{rsvp ? <><p className="muted">{rsvp.name}, sua resposta ajuda a preparar cada detalhe.</p>{rsvp.status === 'pending' ? <div className="rsvp-actions"><button className="primary-button" disabled={saving} onClick={() => answer('confirmed')}>Confirmar presença</button><button className="ghost-button" disabled={saving} onClick={() => answer('declined')}>Não vou conseguir ir</button></div> : <p className="success-message">Resposta registrada: {rsvp.status === 'confirmed' ? 'presença confirmada.' : 'não comparecerá.'}</p>}</> : <p className="muted">{message}</p>}</section></main>;
}