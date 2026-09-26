import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

type Template = { id: number; name: string };
type GuestGroup = { id: number; name: string };
type ScheduledSend = {
  id: number;
  template_id: number;
  template_name: string;
  group_id: number | null;
  group_name: string | null;
  scheduled_time: string;
  status: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ScheduleManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [schedules, setSchedules] = useState<ScheduledSend[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [templateResult, groupResult, scheduleResult] = await Promise.all([
        apiRequest<Template[]>('/templates'),
        apiRequest<GuestGroup[]>('/groups'),
        apiRequest<ScheduledSend[]>('/send/scheduled'),
      ]);
      setTemplates(templateResult);
      setGroups(groupResult);
      setSchedules(scheduleResult);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function scheduleSend() {
    const selectedTime = new Date(scheduledTime);
    if (!templateId || !scheduledTime || Number.isNaN(selectedTime.getTime()) || selectedTime <= new Date()) {
      setError('Escolha um template e um horário futuro para o envio.');
      return;
    }

    setWorking(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/send/schedule', {
        method: 'POST',
        body: JSON.stringify({ template_id: Number(templateId), group_id: groupId ? Number(groupId) : null, scheduled_time: selectedTime.toISOString() }),
      });
      setTemplateId('');
      setGroupId('');
      setScheduledTime('');
      setNotice('Envio agendado com sucesso.');
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível agendar o envio.');
    } finally {
      setWorking(false);
    }
  }

  async function cancelSchedule(schedule: ScheduledSend) {
    if (!window.confirm(`Cancelar o envio de "${schedule.template_name}"?`)) return;
    setCancellingId(schedule.id);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/send/scheduled/${schedule.id}`, { method: 'DELETE' });
      setNotice('Envio cancelado.');
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cancelar o envio.');
    } finally {
      setCancellingId(null);
    }
  }

  return <section className="workspace-panel management-panel schedule-panel">
    <div className="panel-heading"><div><span className="section-label">Envios</span><h2>Agendar envio</h2><p>Escolha quando os convites devem ser enviados automaticamente.</p></div></div>
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="schedule-form">
      <label><span>Template</span><select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={loading || working}><option value="">Selecione um template</option>{templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label>
      <label><span>Grupo de convidados</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)} disabled={loading || working}><option value="">Todos os convidados</option>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
      <label><span>Data e horário</span><input type="datetime-local" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} disabled={loading || working} /></label>
      <button className="primary-button" type="button" disabled={loading || working || !templateId || !scheduledTime} onClick={() => void scheduleSend()}>{working ? 'Agendando...' : 'Agendar envio'}</button>
    </div>
    {loading ? <div className="management-loading">Carregando agendamentos...</div> : schedules.length === 0 ? <div className="empty-state compact-empty"><strong>Nenhum envio agendado</strong><p>Os próximos envios aparecerão aqui.</p></div> : <div className="schedule-list">{schedules.map((schedule) => <article className="schedule-row" key={schedule.id}><div><strong>{schedule.template_name}</strong><span>{formatDate(schedule.scheduled_time)} · {schedule.group_name ?? 'Todos os convidados'}</span></div><div className="schedule-row-actions"><span className={`status-pill schedule-${schedule.status}`}>{schedule.status === 'pending' ? 'Pendente' : schedule.status}</span>{schedule.status === 'pending' && <button className="text-action danger-action" type="button" disabled={cancellingId === schedule.id} onClick={() => void cancelSchedule(schedule)}>{cancellingId === schedule.id ? 'Cancelando...' : 'Cancelar'}</button>}</div></article>)}</div>}
  </section>;
}
