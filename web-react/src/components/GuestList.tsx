type Guest = {
  id: number;
  name: string;
  phone: string;
  group_id: number | null;
  group_name: string | null;
  status: string;
  rsvp_status: string;
};

type Props = {
  guests: Guest[];
  loading: boolean;
  workingId: number | null;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
};

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'declined') return 'Não comparece';
  return 'Aguardando';
}

function deliveryLabel(status: string) {
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Falhou';
  return 'Pendente';
}

export default function GuestList({ guests, loading, workingId, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="guest-table-loading" aria-label="Carregando convidados">
        {[1, 2, 3, 4].map((row) => <div className="guest-skeleton-row" key={row}><span /><span /><span /><span /></div>)}
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-mark" aria-hidden="true">+</span>
        <strong>A lista ainda está vazia</strong>
        <p>Adicione o primeiro convidado ou importe sua planilha para começar.</p>
      </div>
    );
  }

  return (
    <div className="guest-table" role="table" aria-label="Lista de convidados">
      <div className="guest-table-header" role="row">
        <span>Convidado</span><span>Grupo</span><span>Convite</span><span>Resposta</span><span>Ações</span>
      </div>
      {guests.map((guest) => (
        <article className="guest-row" key={guest.id} role="row">
          <div className="guest-identity"><span className="guest-avatar" aria-hidden="true">{guest.name.slice(0, 1).toUpperCase()}</span><span><strong>{guest.name}</strong><small>{guest.phone}</small></span></div>
          <span className="guest-group">{guest.group_name ?? 'Sem grupo'}</span>
          <span><span className={`status-pill delivery-${guest.status}`}>{deliveryLabel(guest.status)}</span></span>
          <span><span className={`status-pill rsvp-${guest.rsvp_status}`}>{statusLabel(guest.rsvp_status)}</span></span>
          <span className="guest-actions"><button className="row-action" type="button" onClick={() => onEdit(guest)}>Editar</button><button className="row-action danger-action" type="button" disabled={workingId === guest.id} onClick={() => onDelete(guest)}>{workingId === guest.id ? 'Excluindo...' : 'Excluir'}</button></span>
        </article>
      ))}
    </div>
  );
}
