type Guest = {
  id: number;
  name: string;
  phone: string;
  group_id: number | null;
  group_name: string | null;
  companion_limit?: number;
  companions?: string[];
  status: string;
  rsvp_status: string;
};

type Props = {
  guests: Guest[];
  loading: boolean;
  workingId: number | null;
  resendingId: number | null;
  sendingAll: boolean;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onResend: (guest: Guest) => void;
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

export default function GuestList({ guests, loading, workingId, resendingId, sendingAll, onEdit, onDelete, onResend }: Props) {
  if (loading) {
    return (
      <div className="guest-table-loading" aria-label="Carregando convidados" aria-busy="true">
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
        <span role="columnheader">Convidado</span><span role="columnheader">Grupo</span><span role="columnheader">Convite</span><span role="columnheader">Resposta</span><span role="columnheader">Ações</span>
      </div>
      {guests.map((guest) => (
        <article className="guest-row" key={guest.id} role="row">
          <div className="guest-identity" role="cell"><span className="guest-avatar" aria-hidden="true">{guest.name.slice(0, 1).toUpperCase()}</span><span><strong>{guest.name}</strong><small>{guest.phone}</small><em>{Array.isArray(guest.companions) ? guest.companions.length : 0} / {guest.companion_limit ?? 0} acompanhantes</em></span></div>
          <span className="guest-group" role="cell">{guest.group_name ?? 'Sem grupo'}</span>
          <span role="cell"><span className={`status-pill delivery-${guest.status}`}>{deliveryLabel(guest.status)}</span></span>
          <span role="cell"><span className={`status-pill rsvp-${guest.rsvp_status}`}>{statusLabel(guest.rsvp_status)}</span></span>
          <span className="guest-actions" role="cell">{guest.status !== 'pending' && <button className="row-action" type="button" disabled={sendingAll || workingId === guest.id || resendingId !== null} onClick={() => onResend(guest)}>{resendingId === guest.id ? 'Enviando...' : 'Reenviar convite'}</button>}<button className="row-action" type="button" disabled={resendingId === guest.id} onClick={() => onEdit(guest)}>Editar</button><button className="row-action danger-action" type="button" disabled={workingId === guest.id || resendingId === guest.id} onClick={() => onDelete(guest)}>{workingId === guest.id ? 'Excluindo...' : 'Excluir'}</button></span>
        </article>
      ))}
    </div>
  );
}
