import { useEffect, useState } from 'react';
import { apiRequest, uploadFile } from '../api/client';
import { useEvents, type ManagedEvent } from '../events/EventProvider';

type EventType = 'wedding' | 'birthday' | 'graduation' | 'baptism' | 'other';

type EventForm = {
  name: string;
  event_type: EventType;
  custom_type: string;
  hosts: string;
  date_time: string;
  location: string;
  address: string;
};

const emptyForm: EventForm = { name: '', event_type: 'wedding', custom_type: '', hosts: '', date_time: '', location: '', address: '' };
const eventTypes: Array<{ value: EventType; label: string }> = [
  { value: 'wedding', label: 'Casamento' },
  { value: 'birthday', label: 'Aniversário' },
  { value: 'graduation', label: 'Formatura' },
  { value: 'baptism', label: 'Batizado' },
  { value: 'other', label: 'Outro' },
];

function dateTimeInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function eventPayload(form: EventForm) {
  return {
    name: form.name.trim(),
    event_type: form.event_type,
    custom_type: form.event_type === 'other' ? form.custom_type.trim() : null,
    hosts: form.hosts.trim() || null,
    date_time: form.date_time ? new Date(form.date_time).toISOString() : null,
    location: form.location.trim() || null,
    address: form.address.trim() || null,
  };
}

export default function EventManagement() {
  const { events, activeEvent, refreshEvents, selectEvent } = useEvents();
  const [archivedEvents, setArchivedEvents] = useState<ManagedEvent[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!showArchived) return;
    setLoadingArchived(true);
    apiRequest<ManagedEvent[]>('/events?archived=true').then(setArchivedEvents).catch((reason) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar eventos arquivados.')).finally(() => setLoadingArchived(false));
  }, [showArchived]);

  function editEvent(event: ManagedEvent) {
    selectEvent(event.id);
    setEditingId(event.id);
    setForm({
      name: event.name,
      event_type: event.event_type as EventType,
      custom_type: event.custom_type ?? '',
      hosts: event.hosts ?? '',
      date_time: dateTimeInput(event.date_time),
      location: event.location ?? '',
      address: event.address ?? '',
    });
    setImage(null);
    setError('');
    setNotice('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImage(null);
  }

  async function saveEvent() {
    if (!form.name.trim() || (form.event_type === 'other' && !form.custom_type.trim())) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      const saved = editingId
        ? await apiRequest<ManagedEvent>(`/events/${editingId}`, { method: 'PUT', body: JSON.stringify(eventPayload(form)) })
        : await apiRequest<ManagedEvent>('/events', { method: 'POST', body: JSON.stringify(eventPayload(form)) });
      selectEvent(saved.id);
      await refreshEvents();
      if (image) await uploadFile('/images/upload', image);
      await refreshEvents();
      setNotice(editingId ? 'Evento atualizado.' : 'Evento criado com template inicial.');
      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o evento.');
    } finally {
      setWorking(false);
    }
  }

  async function archiveEvent(event: ManagedEvent) {
    if (!window.confirm(`Arquivar "${event.name}"? O histórico será preservado e os envios agendados serão cancelados.`)) return;
    setWorking(true);
    setError('');
    try {
      await apiRequest(`/events/${event.id}/archive`, { method: 'POST' });
      await refreshEvents();
      setNotice('Evento arquivado. O histórico foi preservado.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível arquivar o evento.');
    } finally {
      setWorking(false);
    }
  }

  async function restoreEvent(event: ManagedEvent) {
    setWorking(true);
    setError('');
    try {
      await apiRequest(`/events/${event.id}/restore`, { method: 'POST' });
      await refreshEvents();
      setArchivedEvents(await apiRequest<ManagedEvent[]>('/events?archived=true'));
      setNotice('Evento restaurado.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível restaurar o evento.');
    } finally {
      setWorking(false);
    }
  }

  function renderEvent(event: ManagedEvent, archived = false) {
    return <article className={`management-row event-row ${event.id === activeEvent?.id ? 'active-event' : ''}`} key={event.id}>
      <div className="event-row-details">
        <strong>{event.name}</strong>
        <span>{event.event_type_label}{event.hosts ? ` · ${event.hosts}` : ''}{event.date_time ? ` · ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(event.date_time))}` : ''}</span>
      </div>
      <div className="event-row-actions">
        {!archived && <button className="text-action" type="button" disabled={working || editingId === event.id} onClick={() => editEvent(event)}>Editar</button>}
        {archived
          ? <button className="text-action" type="button" disabled={working} onClick={() => void restoreEvent(event)}>Restaurar</button>
          : <button className="text-action danger-action" type="button" disabled={working} onClick={() => void archiveEvent(event)}>Arquivar</button>}
      </div>
    </article>;
  }

  return <section className="workspace-panel management-panel event-management-panel">
    <div className="panel-heading"><div><span className="section-label">Organização</span><h2>Eventos</h2><p>Cada evento mantém sua própria lista, mensagens e confirmações.</p></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="event-form">
      <h3>{editingId ? 'Editar evento' : 'Criar evento'}</h3>
      <div className="event-form-grid">
        <label><span>Nome do evento</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Aniversário da Ana" /></label>
        <label><span>Tipo</span><select value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value as EventType })}>{eventTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
        {form.event_type === 'other' && <label><span>Tipo personalizado</span><input value={form.custom_type} onChange={(event) => setForm({ ...form, custom_type: event.target.value })} placeholder="Ex.: Chá de bebê" /></label>}
        <label><span>Anfitriões ou celebrantes</span><input value={form.hosts} onChange={(event) => setForm({ ...form, hosts: event.target.value })} placeholder="Ex.: Ana" /></label>
        <label><span>Data e horário</span><input type="datetime-local" value={form.date_time} onChange={(event) => setForm({ ...form, date_time: event.target.value })} /></label>
        <label><span>Local</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
        <label><span>Endereço</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label><span>Imagem do convite</span><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
      </div>
      <div className="event-form-actions"><button className="primary-button" type="button" disabled={working || !form.name.trim() || (form.event_type === 'other' && !form.custom_type.trim())} onClick={() => void saveEvent()}>{working ? 'Salvando...' : editingId ? 'Salvar evento' : 'Criar evento'}</button>{editingId && <button className="secondary-button" type="button" disabled={working} onClick={resetForm}>Cancelar edição</button>}</div>
    </div>
    <div className="event-list-heading"><h3>Eventos ativos</h3><span>{events.length}</span></div>
    {events.length ? <div className="management-list event-list">{events.map((event) => renderEvent(event))}</div> : <div className="empty-state compact-empty"><strong>Nenhum evento ativo</strong><p>Crie um evento para começar a organizar convites.</p></div>}
    <button className="text-action archived-toggle" type="button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Ocultar eventos arquivados' : 'Ver eventos arquivados'}</button>
    {showArchived && (loadingArchived ? <div className="management-loading">Carregando eventos arquivados...</div> : archivedEvents.length ? <div className="management-list event-list">{archivedEvents.map((event) => renderEvent(event, true))}</div> : <p className="muted-event-empty">Nenhum evento arquivado.</p>)}
  </section>;
}
