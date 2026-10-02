import { useEffect, useState } from 'react';
import { apiRequest, downloadGuests, uploadFile } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import AppShell from '../components/AppShell';
import GroupManagement from '../components/GroupManagement';
import GuestList from '../components/GuestList';
import SettingsPanel from '../components/SettingsPanel';
import ScheduleManagement from '../components/ScheduleManagement';
import TemplateManagement from '../components/TemplateManagement';
import EventManagement from '../components/EventManagement';
import EventOverview from '../components/EventOverview';
import { useEvents } from '../events/EventProvider';

type Guest = { id: number; name: string; phone: string; group_id: number | null; group_name: string | null; status: string; rsvp_status: string };
type GuestPage = { guests: Guest[]; total: number; pages: number };
type GuestGroup = { id: number; name: string; description: string | null; guest_count: number; created_at: string };

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { events, activeEvent, loading: eventsLoading, error: eventsError, refreshEvents, selectEvent } = useEvents();
  const [activeSection, setActiveSection] = useState('overview');
  const [data, setData] = useState<GuestPage | null>(null);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [groupId, setGroupId] = useState('');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [workingGuestId, setWorkingGuestId] = useState<number | null>(null);
  const [resendingGuestId, setResendingGuestId] = useState<number | null>(null);
  const [sendingMode, setSendingMode] = useState<'pending' | 'all' | null>(null);

  async function loadGuests() {
    setLoading(true);
    try {
      setData(await apiRequest<GuestPage>('/guests?per_page=20'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os convidados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventsLoading) return;
    if (!activeEvent) {
      setData(null);
      setGroups([]);
      setLoading(false);
      setActiveSection('events');
      return;
    }
    resetGuestForm();
    setError('');
    setNotice('');
    if (activeSection !== 'guests') {
      setData(null);
      setGroups([]);
      setLoading(false);
      return;
    }
    void loadGuests();
    apiRequest<GuestGroup[]>('/groups').then(setGroups).catch(() => setGroups([]));
  }, [activeEvent?.id, activeSection, eventsLoading]);

  async function importGuests(file: File) {
    try { const result = await uploadFile('/guests/import', file); setNotice(`${result.imported} convidados importados.`); await loadGuests(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Importação falhou.'); }
  }

  async function exportGuests() {
    try { const blob = await downloadGuests(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'convidados.xlsx'; link.click(); URL.revokeObjectURL(url); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Exportação falhou.'); }
  }

  async function addGuest() {
    try {
      await apiRequest('/guests', { method: 'POST', body: JSON.stringify({ name, phone, group_id: groupId ? Number(groupId) : null }) });
      resetGuestForm();
      setNotice('Convidado adicionado.');
      await loadGuests();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível adicionar o convidado.'); }
  }

  function resetGuestForm() {
    setName('');
    setPhone('');
    setGroupId('');
    setEditingGuest(null);
  }

  function startEditingGuest(guest: Guest) {
    setEditingGuest(guest);
    setName(guest.name);
    setPhone(guest.phone);
    setGroupId(guest.group_id ? String(guest.group_id) : '');
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateGuest() {
    if (!editingGuest) return;
    setWorkingGuestId(editingGuest.id);
    try {
      await apiRequest(`/guests/${editingGuest.id}`, { method: 'PUT', body: JSON.stringify({ name, phone, group_id: groupId ? Number(groupId) : null }) });
      resetGuestForm();
      setNotice('Convidado atualizado.');
      await loadGuests();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível editar o convidado.'); } finally { setWorkingGuestId(null); }
  }

  async function deleteGuest(guest: Guest) {
    if (!window.confirm(`Excluir o convidado "${guest.name}"?`)) return;
    setWorkingGuestId(guest.id);
    setError('');
    try {
      await apiRequest(`/guests/${guest.id}`, { method: 'DELETE' });
      if (editingGuest?.id === guest.id) resetGuestForm();
      setNotice('Convidado excluído.');
      await loadGuests();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o convidado.'); } finally { setWorkingGuestId(null); }
  }

  async function sendNow() {
    setSendingMode('pending');
    try { const result = await apiRequest<{ message: string }>('/send/direct', { method: 'POST', body: JSON.stringify({ filters: { status: 'pending' } }) }); setNotice(result.message); await loadGuests(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar os convites.'); } finally { setSendingMode(null); }
  }

  async function resendAllInvitations() {
    if (!window.confirm('Deseja reenviar os convites para todos os convidados que já receberam ou tiveram falha? Convites pendentes serão ignorados.')) return;
    setSendingMode('all');
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<{ results: Array<{ success: boolean }> }>('/send/direct', {
        method: 'POST',
        body: JSON.stringify({ filters: { exclude_status: 'pending' } }),
      });
      const sentCount = result.results.filter((item) => item.success).length;
      setNotice(`Convites reenviados: ${sentCount}/${result.results.length}.`);
      await loadGuests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível reenviar os convites.');
    } finally {
      setSendingMode(null);
    }
  }

  async function resendInvitation(guest: Guest) {
    setResendingGuestId(guest.id);
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<{ results: Array<{ guest_id: number; success: boolean; error?: string }> }>('/send/direct', {
        method: 'POST',
        body: JSON.stringify({ guest_ids: [guest.id] }),
      });
      const outcome = result.results.find((item) => item.guest_id === guest.id);
      setNotice(outcome?.success
        ? `Convite reenviado para ${guest.name}.`
        : `Não foi possível reenviar o convite para ${guest.name}${outcome?.error ? `: ${outcome.error}` : '.'}`);
      await loadGuests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível reenviar o convite.');
    } finally {
      setResendingGuestId(null);
    }
  }

  const guests = data?.guests ?? [];
  function renderWorkspace() {
    if (eventsLoading) return <div className="workspace-panel management-loading">Carregando eventos...</div>;
    if (activeSection === 'events' || !activeEvent) return <EventManagement />;
    if (activeSection === 'overview') return <EventOverview
      events={events}
      activeEventId={activeEvent.id}
      loading={eventsLoading}
      error={eventsError}
      onOpenEvent={(eventId) => { selectEvent(eventId); setActiveSection('guests'); }}
      onCreateEvent={() => setActiveSection('events')}
      onRetry={() => void refreshEvents()}
    />;
    if (activeSection === 'settings') return <SettingsPanel />;
    if (activeSection === 'groups') return <GroupManagement />;
    if (activeSection === 'messages') return <><TemplateManagement /><ScheduleManagement /></>;
    if (activeSection !== 'guests') return null;

    return <>
      <section className="workspace-panel quick-add-panel">
        <div className="panel-heading"><div><span className="section-label">Próxima ação</span><h2>Adicionar convidado</h2><p>Inclua alguém na lista e organize o grupo depois.</p></div><button className="text-action" type="button" onClick={() => setActiveSection('groups')}>Gerenciar grupos</button></div>
        <div className="inline-form modern-form"><label><span>Nome completo</span><input aria-label="Nome" placeholder="Ex.: Maria da Silva" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Telefone</span><input aria-label="Telefone" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label><span>Grupo</span><select aria-label="Grupo" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Sem grupo</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><div className="guest-form-actions"><button className="primary-button" disabled={!name.trim() || !phone.trim() || workingGuestId !== null} onClick={editingGuest ? updateGuest : addGuest}>{editingGuest ? 'Salvar alterações' : 'Adicionar convidado'}</button>{editingGuest && <button className="secondary-button" type="button" onClick={resetGuestForm}>Cancelar</button>}</div></div>
      </section>

      <section className="workspace-panel guest-workspace">
        <div className="panel-heading"><div><span className="section-label">Lista atual</span><h2>Convidados</h2><p>Veja o andamento dos convites e das confirmações.</p></div><div className="guest-list-tools"><label className="excel-button">Importar Excel<input type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && importGuests(event.target.files[0])} /></label><button className="excel-button" type="button" onClick={exportGuests}>Exportar Excel</button><span className="page-indicator">Página 1 de {data?.pages ?? '—'}</span></div></div>
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        {error ? <div className="inline-error" role="alert"><strong>Não foi possível atualizar a lista.</strong><span>{error}</span><button className="text-action" type="button" onClick={() => void loadGuests()}>Tentar novamente</button></div> : <GuestList guests={guests} loading={loading} workingId={workingGuestId} resendingId={resendingGuestId} sendingAll={sendingMode !== null} onEdit={startEditingGuest} onDelete={deleteGuest} onResend={resendInvitation} />}
      </section>
    </>;
  }

  return <AppShell activeSection={activeSection} username={user?.username} onNavigate={setActiveSection} onLogout={logout}>
    <header className="workspace-header"><div><span className="section-label">{activeSection === 'overview' ? 'Todos os eventos' : activeEvent?.event_type_label ?? 'Organização'}</span><h1>{activeSection === 'overview' ? 'Visão geral' : activeSection === 'guests' ? 'Convidados' : activeEvent?.name ?? 'Seus eventos'}</h1><p>{activeSection === 'overview' ? 'Acompanhe convidados e confirmações de cada evento.' : activeEvent ? [activeEvent.name, activeEvent.hosts, activeEvent.location].filter(Boolean).join(' · ') : eventsError || 'Crie seu primeiro evento para começar.'}</p></div><div className="header-actions">{activeSection === 'guests' && <><button className="secondary-button compact-button" type="button" disabled={sendingMode !== null || resendingGuestId !== null || !activeEvent || eventsLoading} onClick={resendAllInvitations}>{sendingMode === 'all' ? 'Reenviando...' : 'Reenviar para todos'}</button><button className="primary-button compact-button" type="button" disabled={sendingMode !== null || resendingGuestId !== null || !activeEvent || eventsLoading} onClick={sendNow}>{sendingMode === 'pending' ? 'Enviando...' : 'Enviar pendentes'}</button></>}</div></header>
    {renderWorkspace()}
  </AppShell>;
}