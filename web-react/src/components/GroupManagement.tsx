import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

type GuestGroup = { id: number; name: string; description: string | null; guest_count: number; created_at: string };

export default function GroupManagement() {
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadGroups() {
    setLoading(true);
    try { setGroups(await apiRequest<GuestGroup[]>('/groups')); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os grupos.'); } finally { setLoading(false); }
  }

  useEffect(() => { void loadGroups(); }, []);

  async function createGroup() {
    if (!name.trim()) return;
    setWorking(true); setError(''); setNotice('');
    try { await apiRequest('/groups', { method: 'POST', body: JSON.stringify({ name: name.trim(), description: description.trim() || null }) }); setName(''); setDescription(''); setNotice('Grupo criado com sucesso.'); await loadGroups(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o grupo.'); } finally { setWorking(false); }
  }

  async function deleteGroup(id: number) {
    if (!window.confirm('Deseja excluir este grupo? Os convidados serão preservados.')) return;
    setWorking(true); setError('');
    try { await apiRequest(`/groups/${id}`, { method: 'DELETE' }); setNotice('Grupo excluído.'); await loadGroups(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o grupo.'); } finally { setWorking(false); }
  }

  return <section className="workspace-panel management-panel"><div className="panel-heading"><div><span className="section-label">Organização</span><h2>Grupos de convidados</h2><p>Separe famílias, amigos e listas para facilitar os envios.</p></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="management-form"><label><span>Nome do grupo</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Família da noiva" /></label><label><span>Descrição</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Opcional" /></label><button className="primary-button" disabled={working || !name.trim()} onClick={createGroup}>{working ? 'Salvando...' : 'Criar grupo'}</button></div>
    {loading ? <div className="management-loading">Carregando grupos...</div> : groups.length === 0 ? <div className="empty-state compact-empty"><span className="empty-state-mark" aria-hidden="true">+</span><strong>Nenhum grupo criado</strong><p>Crie um grupo para organizar a lista de convidados.</p></div> : <div className="management-list">{groups.map((group) => <article className="management-row" key={group.id}><div><strong>{group.name}</strong><span>{group.description || 'Sem descrição'} · {group.guest_count} convidado(s)</span></div><button className="text-action danger-action" disabled={working} onClick={() => void deleteGroup(group.id)}>Excluir</button></article>)}</div>}
  </section>;
}
