import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '../api/client';
import CompanionEditor from '../components/CompanionEditor';

type Rsvp = {
  name: string;
  status: 'pending' | 'confirmed' | 'declined';
  responded_at: string | null;
  companion_limit: number;
  companions: string[];
  event: { name: string; event_type_label: string; hosts: string | null; date_time: string | null; location: string | null; address: string | null; image_url?: string | null } | null;
};

export default function RsvpPage({ token }: { token: string }) {
  const [rsvp, setRsvp] = useState<Rsvp | null>(null);
  const [message, setMessage] = useState('Carregando convite...');
  const [saving, setSaving] = useState(false);
  const [companionNames, setCompanionNames] = useState<string[]>([]);

  useEffect(() => { apiRequest<Rsvp>(`/rsvp/${encodeURIComponent(token)}`).then((next) => { setRsvp(next); setCompanionNames(next.companions ?? []); }).catch((error) => setMessage(error instanceof ApiError ? error.message : 'Convite indisponível.')); }, [token]);

  async function answer(response: 'confirmed' | 'declined') {
    setSaving(true);
    try {
      const payload = response === 'confirmed'
        ? { response, companions: companionNames.map((name) => name.trim()).filter(Boolean) }
        : { response };
      setRsvp(await apiRequest<Rsvp>(`/rsvp/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify(payload) }));
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Não foi possível registrar sua resposta.'); } finally { setSaving(false); }
  }

  return <main className="rsvp-page"><section className="rsvp-card">{rsvp?.event?.image_url && <img className="rsvp-cover" src={rsvp.event.image_url} alt="Imagem do convite" />}<div className="rsvp-content"><p className="eyebrow">{rsvp?.event?.event_type_label ?? 'Convite'}</p><h1>Confirmação de presença</h1>{rsvp ? <><p className="rsvp-event-name">{rsvp.event?.name}</p>{rsvp.event?.hosts && <p className="rsvp-hosts">Com {rsvp.event.hosts}</p>}<div className="rsvp-details">{rsvp.event?.date_time && <p>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(rsvp.event.date_time))}</p>}{rsvp.event?.location && <p>{rsvp.event.location}{rsvp.event.address ? ` · ${rsvp.event.address}` : ''}</p>}</div><p className="rsvp-greeting">{rsvp.name}, sua presença fará parte desta celebração.</p>{rsvp.status === 'pending' ? <div className="rsvp-actions"><div className="companion-gate">{rsvp.companion_limit > 0 && <CompanionEditor limit={rsvp.companion_limit} names={companionNames} onChange={setCompanionNames} disabled={saving} />}</div><button className="primary-button" disabled={saving} onClick={() => answer('confirmed')}>Confirmar presença</button><button className="ghost-button" disabled={saving} onClick={() => answer('declined')}>Não poderei comparecer</button></div> : <p className="success-message" role="status">Sua resposta foi registrada: {rsvp.status === 'confirmed' ? 'presença confirmada.' : 'não poderá comparecer.'}</p>}</> : <p className="muted">{message}</p>}</div></section></main>;
}
