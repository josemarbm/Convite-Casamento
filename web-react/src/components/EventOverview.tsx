import MetricCard from './MetricCard';
import type { ManagedEvent } from '../events/EventProvider';

type Props = {
  events: ManagedEvent[];
  activeEventId: number | null;
  loading: boolean;
  error: string;
  onOpenEvent: (eventId: number) => void;
  onCreateEvent: () => void;
  onRetry: () => void;
};

function formatEventDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function EventOverview({ events, activeEventId, loading, error, onOpenEvent, onCreateEvent, onRetry }: Props) {
  const totals = events.reduce((summary, event) => ({
    guests: summary.guests + (event.guest_count ?? 0),
    confirmed: summary.confirmed + (event.confirmed_count ?? 0),
    pending: summary.pending + (event.pending_rsvp_count ?? 0),
  }), { guests: 0, confirmed: 0, pending: 0 });

  if (loading) return <div className="workspace-panel management-loading">Carregando resumo dos eventos...</div>;

  if (error) return <section className="workspace-panel"><div className="inline-error" role="alert"><span>{error}</span><button className="text-action" type="button" onClick={onRetry}>Tentar novamente</button></div></section>;

  return <>
    <section className="metric-grid event-overview-metrics" aria-label="Resumo de todos os eventos">
      <MetricCard label="Eventos ativos" value={events.length} detail="eventos em andamento" />
      <MetricCard label="Convidados" value={totals.guests} detail="somados entre os eventos" />
      <MetricCard label="Confirmados" value={totals.confirmed} detail="presenças confirmadas" tone="green" />
      <MetricCard label="Aguardando RSVP" value={totals.pending} detail="respostas pendentes" tone="amber" />
    </section>

    <section className="workspace-panel event-overview-panel">
      <div className="panel-heading"><div><h2>Eventos</h2><p>Compare convidados e confirmações em um só lugar.</p></div></div>
      {events.length === 0 ? <div className="empty-state compact-empty"><strong>Nenhum evento ativo</strong><p>Crie um evento para começar a organizar convidados e confirmações.</p><button className="secondary-button" type="button" onClick={onCreateEvent}>Criar evento</button></div> : <div className="event-overview-list">{events.map((event) => <article className={`event-overview-row ${event.id === activeEventId ? 'selected' : ''}`} key={event.id}>
        <div className="event-overview-identity"><div className="event-overview-title"><h3>{event.name}</h3>{event.id === activeEventId && <span className="status-pill rsvp-confirmed">Selecionado</span>}</div><p>{[event.event_type_label, event.hosts, formatEventDate(event.date_time), event.location].filter(Boolean).join(' · ')}</p></div>
        <div className="event-overview-counts" aria-label={`RSVP de ${event.name}`}>
          <span><strong>{event.guest_count ?? 0}</strong> convidados</span>
          <span><strong>{event.confirmed_count ?? 0}</strong> confirmados</span>
          <span><strong>{event.pending_rsvp_count ?? 0}</strong> aguardando</span>
          <span><strong>{event.declined_count ?? 0}</strong> recusaram</span>
        </div>
        <button className="secondary-button event-overview-action" type="button" onClick={() => onOpenEvent(event.id)}>Abrir convidados</button>
      </article>)}</div>}
    </section>
  </>;
}
