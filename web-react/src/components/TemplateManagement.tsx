import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

type Template = { id: number; name: string; content: string; is_default: boolean };

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadTemplates() {
    setLoading(true);
    try { setTemplates(await apiRequest<Template[]>('/templates')); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os templates.'); } finally { setLoading(false); }
  }

  useEffect(() => { void loadTemplates(); }, []);

  async function createTemplate() {
    if (!name.trim() || !content.trim()) return;
    setWorking(true); setError(''); setNotice('');
    try { await apiRequest('/templates', { method: 'POST', body: JSON.stringify({ name: name.trim(), content: content.trim(), is_default: isDefault }) }); setName(''); setContent(''); setIsDefault(false); setNotice('Template criado com sucesso.'); await loadTemplates(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível criar o template.'); } finally { setWorking(false); }
  }

  async function deleteTemplate(id: number) {
    if (!window.confirm('Deseja excluir este template?')) return;
    setWorking(true); setError('');
    try { await apiRequest(`/templates/${id}`, { method: 'DELETE' }); setNotice('Template excluído.'); await loadTemplates(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o template.'); } finally { setWorking(false); }
  }

  return <section className="workspace-panel management-panel"><div className="panel-heading"><div><span className="section-label">Comunicação</span><h2>Templates de mensagem</h2><p>Prepare mensagens reutilizáveis para os envios do convite.</p></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="template-form"><label><span>Nome do template</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Convite especial" /></label><label><span>Mensagem</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Use {nome} para personalizar a mensagem." rows={5} /></label><label className="checkbox-field"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Definir como padrão</label><button className="primary-button" disabled={working || !name.trim() || !content.trim()} onClick={createTemplate}>{working ? 'Salvando...' : 'Criar template'}</button></div>
    {loading ? <div className="management-loading">Carregando templates...</div> : templates.length === 0 ? <div className="empty-state compact-empty"><strong>Nenhum template criado</strong><p>Crie uma mensagem para começar os envios.</p></div> : <div className="template-list">{templates.map((template) => <article className={`template-row ${template.is_default ? 'default' : ''}`} key={template.id}><div><div className="template-title"><strong>{template.name}</strong>{template.is_default && <span className="status-pill rsvp-confirmed">Padrão</span>}</div><p>{template.content}</p></div><button className="text-action danger-action" disabled={working || template.is_default} onClick={() => void deleteTemplate(template.id)}>Excluir</button></article>)}</div>}
  </section>;
}
