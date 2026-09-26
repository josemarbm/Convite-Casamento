import { useEffect, useState } from 'react';
import { apiRequest, downloadGuests, uploadFile } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import AppShell from '../components/AppShell';
import GroupManagement from '../components/GroupManagement';
import GuestList from '../components/GuestList';
import MetricCard from '../components/MetricCard';
import SettingsPanel from '../components/SettingsPanel';
import ScheduleManagement from '../components/ScheduleManagement';
import TemplateManagement from '../components/TemplateManagement';

type Guest = { id: number; name: string; phone: string; group_id: number | null; group_name: string | null; status: string; rsvp_status: string };
type GuestPage = { guests: Guest[]; total: number; pages: number };
type GuestGroup = { id: number; name: string; description: string | null; guest_count: number; created_at: string };

export default function DashboardPage() {
  const { user, logout } = useAuth();
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
  const [sending, setSending] = useState(false);

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
    void loadGuests();
    apiRequest<GuestGroup[]>('/groups').then(setGroups).catch(() => setGroups([]));
  }, []);

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
    setSending(true);
    try { const result = await apiRequest<{ message: string }>('/send/direct', { method: 'POST', body: JSON.stringify({ filters: { status: 'pending' } }) }); setNotice(result.message); await loadGuests(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar os convites.'); } finally { setSending(false); }
  }

  const guests = data?.guests ?? [];
  const confirmed = guests.filter((guest) => guest.rsvp_status === 'confirmed').length;
  const pending = guests.filter((guest) => guest.status === 'pending').length;

  function renderWorkspace() {
    if (activeSection === 'settings') return <SettingsPanel />;
    if (activeSection === 'groups') return <GroupManagement />;
    if (activeSection === 'messages') return <><TemplateManagement /><ScheduleManagement /></>;

    return <>
      <section className="metric-grid" aria-label="Resumo da lista">
        <MetricCard label="Convidados" value={data?.total ?? '—'} detail="na lista total" />
        <MetricCard label="Confirmados" value={data ? confirmed : '—'} detail="respostas positivas" tone="green" />
        <MetricCard label="Aguardando" value={data ? pending : '—'} detail="convites pendentes" tone="amber" />
        <MetricCard label="Página" value={data?.pages ?? '—'} detail="de convidados" tone="rose" />
      </section>

      <section className="workspace-panel quick-add-panel">
        <div className="panel-heading"><div><span className="section-label">Próxima ação</span><h2>Adicionar convidado</h2><p>Inclua alguém na lista e organize o grupo depois.</p></div><button className="text-action" type="button" onClick={() => setActiveSection('groups')}>Gerenciar grupos</button></div>
        <div className="inline-form modern-form"><label><span>Nome completo</span><input aria-label="Nome" placeholder="Ex.: Maria da Silva" value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Telefone</span><input aria-label="Telefone" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label><span>Grupo</span><select aria-label="Grupo" value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Sem grupo</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label><div className="guest-form-actions"><button className="primary-button" disabled={!name.trim() || !phone.trim() || workingGuestId !== null} onClick={editingGuest ? updateGuest : addGuest}>{editingGuest ? 'Salvar alterações' : 'Adicionar convidado'}</button>{editingGuest && <button className="secondary-button" type="button" onClick={resetGuestForm}>Cancelar</button>}</div></div>
      </section>

      <section className="workspace-panel guest-workspace">
        <div className="panel-heading"><div><span className="section-label">Lista atual</span><h2>Convidados</h2><p>Veja o andamento dos convites e das confirmações.</p></div><div className="guest-list-tools"><label className="excel-button">Importar Excel<input type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && importGuests(event.target.files[0])} /></label><button className="excel-button" type="button" onClick={exportGuests}>Exportar Excel</button><span className="page-indicator">Página 1 de {data?.pages ?? '—'}</span></div></div>
        {notice && <p className="inline-notice" role="status">{notice}</p>}
        {error ? <div className="inline-error" role="alert"><strong>Não foi possível atualizar a lista.</strong><span>{error}</span><button className="text-action" type="button" onClick={() => void loadGuests()}>Tentar novamente</button></div> : <GuestList guests={guests} loading={loading} workingId={workingGuestId} onEdit={startEditingGuest} onDelete={deleteGuest} />}
      </section>
    </>;
  }

  return <AppShell activeSection={activeSection} username={user?.username} onNavigate={setActiveSection} onLogout={logout}>
    <header className="workspace-header"><div><span className="section-label">Painel de celebração</span><h1>Olá, {user?.username}</h1><p>Acompanhe os convidados e deixe cada detalhe encaminhado.</p></div><div className="header-actions"><button className="primary-button compact-button" type="button" disabled={sending} onClick={sendNow}>{sending ? 'Enviando...' : 'Enviar pendentes'}</button></div></header>
    {renderWorkspace()}
  </AppShell>;
}