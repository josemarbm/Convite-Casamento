type Props = {
  search: string;
  status: string;
  rsvpStatus: string;
  page: number;
  pages: number;
  total: number;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onRsvpStatus: (value: string) => void;
  onPage: (page: number) => void;
};

export default function GuestListControls({ search, status, rsvpStatus, page, pages, total, onSearch, onStatus, onRsvpStatus, onPage }: Props) {
  return <>
    <div className="guest-filters" aria-label="Filtros de convidados">
      <label><span>Buscar</span><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Nome ou telefone" /></label>
      <label><span>Convite</span><select value={status} onChange={(event) => onStatus(event.target.value)}><option value="">Todos</option><option value="pending">Pendente</option><option value="sent">Enviado</option><option value="failed">Falhou</option></select></label>
      <label><span>Resposta</span><select value={rsvpStatus} onChange={(event) => onRsvpStatus(event.target.value)}><option value="">Todas</option><option value="pending">Aguardando</option><option value="confirmed">Confirmado</option><option value="declined">Não comparece</option></select></label>
      <span className="page-indicator">{total} convidados · página {page} de {pages || 1}</span>
    </div>
    {pages > 1 && <nav className="pagination" aria-label="Paginação de convidados"><button className="secondary-button" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button><span>Página {page} de {pages}</span><button className="secondary-button" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima</button></nav>}
  </>;
}
