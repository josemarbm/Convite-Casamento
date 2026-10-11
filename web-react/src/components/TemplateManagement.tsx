import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client';

type Template = { id: number; name: string; content: string; is_default: boolean };

const FIELDS = [
  ['{nome}', 'Nome do convidado'], ['{event_name}', 'Nome do evento'], ['{event_date_time}', 'Data e hora'],
  ['{event_location}', 'Local'], ['{event_address}', 'Endereço'], ['{hosts}', 'Anfitriões'], ['{rsvp_url}', 'Link de confirmação'],
] as const;

const PREVIEW_VALUES: Record<string, string> = {
  '{nome}': 'Maria da Silva', '{event_name}': 'Nosso casamento', '{event_date_time}': 'sábado, 12 de dezembro de 2026 às 16:00',
  '{event_location}': 'Espaço Jardim das Flores', '{event_address}': 'Rua das Flores, 120', '{hosts}': 'Ana e João', '{rsvp_url}': 'https://convite.exemplo.com/rsvp',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] ?? character));
}

function previewHtml(content: string) {
  let html = escapeHtml(content);
  for (const [field, value] of Object.entries(PREVIEW_VALUES)) html = html.replaceAll(field, `<span class="template-preview-field">${escapeHtml(value)}</span>`);
  html = html.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/_([^_\n]+)_/g, '<em>$1</em>').replace(/~([^~\n]+)~/g, '<del>$1</del>').replace(/```([^`\n]+)```/g, '<code>$1</code>').replace(/\n/g, '<br />');
  return html || '<span class="template-preview-placeholder">Sua mensagem aparecerá aqui.</span>';
}

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState(''); const [content, setContent] = useState(''); const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true); const [working, setWorking] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  async function loadTemplates() {
    setLoading(true);
    try { setTemplates(await apiRequest<Template[]>('/templates')); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os templates.'); } finally { setLoading(false); }
  }
  useEffect(() => { void loadTemplates(); }, []);
  function resetEditor() { setEditingId(null); setName(''); setContent(''); setIsDefault(false); }
  function editTemplate(template: Template) { setEditingId(template.id); setName(template.name); setContent(template.content); setIsDefault(template.is_default); setNotice(''); setError(''); window.setTimeout(() => editorRef.current?.focus(), 0); }

  function wrapSelection(before: string, after = before) {
    const editor = editorRef.current; if (!editor) return;
    const start = editor.selectionStart; const end = editor.selectionEnd; const selected = content.slice(start, end); const value = selected || 'texto';
    setContent(`${content.slice(0, start)}${before}${value}${after}${content.slice(end)}`);
    window.setTimeout(() => { editor.focus(); editor.setSelectionRange(start + before.length, start + before.length + value.length); }, 0);
  }
  function insertField(field: string) {
    const editor = editorRef.current; if (!editor) return;
    const start = editor.selectionStart; const end = editor.selectionEnd; setContent(`${content.slice(0, start)}${field}${content.slice(end)}`);
    window.setTimeout(() => { editor.focus(); editor.setSelectionRange(start + field.length, start + field.length); }, 0);
  }
  async function saveTemplate(saveAsNew = false) {
    if (!name.trim() || !content.trim()) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const body = { name: name.trim(), content: content.trim(), is_default: isDefault };
      if (editingId !== null && !saveAsNew) { await apiRequest(`/templates/${editingId}`, { method: 'PUT', body: JSON.stringify(body) }); setNotice('Template atualizado.'); }
      else { await apiRequest('/templates', { method: 'POST', body: JSON.stringify(body) }); setNotice('Template criado com sucesso.'); resetEditor(); }
      await loadTemplates();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o template.'); } finally { setWorking(false); }
  }
  async function deleteTemplate(id: number) {
    if (!window.confirm('Deseja excluir este template?')) return; setWorking(true); setError('');
    try { await apiRequest(`/templates/${id}`, { method: 'DELETE' }); setNotice('Template excluído.'); if (editingId === id) resetEditor(); await loadTemplates(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o template.'); } finally { setWorking(false); }
  }
  async function setDefaultTemplate(id: number) {
    setWorking(true); setError(''); setNotice('');
    try { await apiRequest(`/templates/${id}`, { method: 'PUT', body: JSON.stringify({ is_default: true }) }); setNotice('Template padrão atualizado.'); await loadTemplates(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível definir o template padrão.'); } finally { setWorking(false); }
  }

  return <section className="workspace-panel management-panel">
    <div className="panel-heading"><div><span className="section-label">Comunicação</span><h2>Templates de mensagem</h2><p>Crie mensagens personalizadas e veja como elas chegarão no WhatsApp.</p></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}{error && <p className="inline-error" role="alert">{error}</p>}
    <div className="template-builder"><div className="template-editor-column"><div className="template-form template-form-editor">
      <label><span>Nome do template</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Convite especial" /></label>
      <div className="template-message-field"><span className="template-field-label">Mensagem</span><div className="template-toolbar" aria-label="Formatação da mensagem">
        <button type="button" title="Negrito" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('*')}><strong>B</strong></button><button type="button" title="Itálico" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('_')}><em>I</em></button><button type="button" title="Tachado" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('~')}><del>S</del></button><button type="button" title="Monoespaçado" onMouseDown={(event) => event.preventDefault()} onClick={() => wrapSelection('```')}><code>M</code></button><span className="template-toolbar-divider" />
        <select className="template-field-select" aria-label="Inserir campo" value="" onChange={(event) => { if (event.target.value) insertField(event.target.value); }}><option value="">Inserir campo...</option>{FIELDS.map(([field, label]) => <option key={field} value={field}>{label}</option>)}</select>
      </div><textarea ref={editorRef} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Olá, {nome}! Você está convidado..." rows={9} /><small className="field-help">Use os botões acima para formatar o texto e inserir informações do evento.</small></div>
      <label className="checkbox-field"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Definir como padrão</label><div className="template-form-actions"><button className="primary-button" type="button" disabled={working || !name.trim() || !content.trim()} onClick={() => void saveTemplate()}>{working ? 'Salvando...' : editingId === null ? 'Criar template' : 'Salvar alterações'}</button>{editingId !== null && <button className="secondary-button" type="button" disabled={working} onClick={() => void saveTemplate(true)}>Salvar como novo</button>}{editingId !== null && <button className="text-action" type="button" disabled={working} onClick={resetEditor}>Cancelar</button>}</div>
    </div></div><div className="template-preview-column"><div className="template-preview-heading"><span className="template-preview-label">Prévia</span><span>Conversa no WhatsApp</span></div><div className="whatsapp-preview"><div className="whatsapp-preview-header"><span className="whatsapp-avatar">♥</span><div><strong>Convidado</strong><small>online</small></div></div><div className="whatsapp-preview-body"><div className="whatsapp-bubble" dangerouslySetInnerHTML={{ __html: previewHtml(content) }} /><span className="whatsapp-time">agora&nbsp; ✓✓</span></div></div><small className="field-help">Os campos aparecem preenchidos apenas na prévia. No envio, cada convidado verá seus próprios dados.</small></div></div>
    {loading ? <div className="management-loading">Carregando templates...</div> : templates.length === 0 ? <div className="empty-state compact-empty"><strong>Nenhum template criado</strong><p>Crie uma mensagem para começar os envios.</p></div> : <div className="template-list">{templates.map((template) => <article className={`template-row ${template.is_default ? 'default' : ''}`} key={template.id}><div><div className="template-title"><strong>{template.name}</strong>{template.is_default && <span className="status-pill rsvp-confirmed">Padrão</span>}</div><p>{template.content}</p></div><div className="template-actions"><button className="text-action" type="button" disabled={working} onClick={() => editTemplate(template)}>Editar</button>{!template.is_default && <button className="text-action" type="button" disabled={working} onClick={() => void setDefaultTemplate(template.id)}>Definir como padrão</button>}<button className="text-action danger-action" type="button" disabled={working || template.is_default} onClick={() => void deleteTemplate(template.id)}>Excluir</button></div></article>)}</div>}
  </section>;
}
