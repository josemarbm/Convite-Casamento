import { useEffect, useState } from 'react';
import { apiRequest, uploadFile } from '../api/client';

type SettingsState = {
  evolution_api_url: string;
  evolution_api_key: string;
  evolution_session_id: string;
  image_path: string;
};

type EvolutionInstance = {
  name: string;
  status: string;
  owner?: string;
  active: boolean;
};

const initialSettings: SettingsState = {
  evolution_api_url: '',
  evolution_api_key: '',
  evolution_session_id: '',
  image_path: '',
};

function normalizeQrValue(value: unknown): string | null {
  const candidates: unknown[] = [];

  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const queue: unknown[] = [record];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const key of ['qrcode', 'qrCode', 'qr', 'base64', 'image', 'data', 'code', 'url']) {
      if (key in current) {
        candidates.push((current as Record<string, unknown>)[key]);
      }
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
    } else {
      for (const valueItem of Object.values(current)) queue.push(valueItem);
    }
  }

  for (const candidate of candidates) {
    const normalized = normalizeQrValue(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      apiRequest<Record<string, string>>('/settings'),
      apiRequest<{ instances: EvolutionInstance[] }>('/evolution/instances'),
    ])
      .then(([settingsResult, instancesResult]) => {
        if (!isMounted) return;
        setSettings({
          evolution_api_url: settingsResult.evolution_api_url ?? '',
          evolution_api_key: settingsResult.evolution_api_key ?? '',
          evolution_session_id: settingsResult.evolution_session_id ?? '',
          image_path: settingsResult.image_path ?? '',
        });
        setInstances(instancesResult.instances ?? []);
      })
      .catch((reason) => {
        if (!isMounted) return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as configurações.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadInstances() {
    const result = await apiRequest<{ instances: EvolutionInstance[] }>('/evolution/instances');
    setInstances(result.instances ?? []);
  }

  async function saveSettings() {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        evolution_api_url: settings.evolution_api_url,
        evolution_api_key: settings.evolution_api_key,
        evolution_session_id: settings.evolution_session_id,
        image_path: settings.image_path,
      };

      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setNotice('Configurações salvas com sucesso.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadInvitationImage(file: File) {
    setWorking('image-upload');
    setError('');
    setNotice('');

    try {
      const result = await uploadFile('/images/upload', file) as { path: string };
      setSettings((current) => ({ ...current, image_path: result.path }));
      setNotice('Imagem do convite enviada com sucesso.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a imagem do convite.');
    } finally {
      setWorking(null);
    }
  }

  async function createInstance() {
    const name = newInstanceName.trim();
    if (!/^[a-z0-9]+$/.test(name)) {
      setError('Use somente letras minúsculas e números no nome da instância.');
      return;
    }

    setWorking(name);
    setError('');
    setNotice('');

    try {
      await apiRequest('/evolution/instances', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewInstanceName('');
      await loadInstances();
      setNotice(`Instância "${name}" criada com sucesso.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a instância.');
    } finally {
      setWorking(null);
    }
  }

  async function activateInstance(name: string) {
    setWorking(name);
    setError('');
    setNotice('');

    try {
      await apiRequest(`/evolution/instances/${encodeURIComponent(name)}/activate`, { method: 'POST' });
      setSettings((current) => ({ ...current, evolution_session_id: name }));
      await loadInstances();
      setNotice(`Instância "${name}" ativada.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível ativar a instância.');
    } finally {
      setWorking(null);
    }
  }

  async function disconnectInstance(name: string, action: 'logout' | 'delete') {
    const operationLabel = action === 'logout' ? 'desconectar' : 'excluir';
    if (!window.confirm(`Deseja ${operationLabel} a instância "${name}"?`)) return;

    setWorking(name);
    setError('');
    setNotice('');

    try {
      await apiRequest(`/evolution/instances/${encodeURIComponent(name)}${action === 'logout' ? '/logout' : ''}`, {
        method: action === 'logout' ? 'DELETE' : 'DELETE',
      });
      if (action === 'delete' && settings.evolution_session_id === name) {
        setSettings((current) => ({ ...current, evolution_session_id: '' }));
      }
      setQrCodes((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
      await loadInstances();
      setNotice(action === 'logout' ? `Instância "${name}" desconectada.` : `Instância "${name}" excluída.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível executar a ação.');
    } finally {
      setWorking(null);
    }
  }

  async function readQrCode(name: string) {
    setWorking(name);
    setError('');
    setNotice('');

    try {
      const result = await apiRequest<{ data: unknown }>(`/evolution/instances/${encodeURIComponent(name)}/qr`);
      const qrValue = normalizeQrValue(result.data ?? result);

      if (!qrValue) {
        setError(`Não foi possível ler o QR Code da instância "${name}".`);
        return;
      }

      setQrCodes((current) => ({ ...current, [name]: qrValue }));
      setNotice(`QR Code da instância "${name}" atualizado.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível ler o QR Code.');
    } finally {
      setWorking(null);
    }
  }

  async function testConnection(name: string) {
    setWorking(`connection-${name}`);
    setError('');
    setNotice('');

    try {
      const result = await apiRequest<{ data: unknown }>(`/evolution/instances/${encodeURIComponent(name)}/connection`);
      const state = typeof result.data === 'object' && result.data !== null
        ? String((result.data as Record<string, unknown>).state ?? (result.data as Record<string, unknown>).status ?? 'respondendo')
        : String(result.data ?? 'respondendo');
      setNotice(`Conexão da instância "${name}": ${state}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Não foi possível testar a conexão da instância "${name}".`);
    } finally {
      setWorking(null);
    }
  }

  const updateField = (key: keyof SettingsState, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="surface settings-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sistema</p>
          <h2>Configurações</h2>
        </div>
      </div>

      {notice && <p className="success-message">{notice}</p>}
      {error && <p className="error">{error}</p>}

      {loading && <p className="muted">Carregando configurações…</p>}

      <div className="settings-form">
        <label>
          Evolution API
          <input
            value={settings.evolution_api_url}
            onChange={(event) => updateField('evolution_api_url', event.target.value)}
            placeholder="http://localhost:8080"
            disabled={loading}
          />
        </label>

        <label>
          Chave da API
          <input
            value={settings.evolution_api_key}
            onChange={(event) => updateField('evolution_api_key', event.target.value)}
            placeholder="token-da-api"
            disabled={loading}
          />
        </label>

        <label>
          Sessão ativa
          <input
            value={settings.evolution_session_id}
            onChange={(event) => updateField('evolution_session_id', event.target.value)}
            placeholder="default"
            disabled={loading}
          />
        </label>

        <div className="image-upload-field">
          <span>Caminho da imagem do convite</span>
          <div className="image-upload-row">
            <input value={settings.image_path} placeholder="Nenhuma imagem enviada" readOnly disabled={loading} />
            <label className="secondary-button image-upload-button">
              {working === 'image-upload' ? 'Enviando...' : 'Escolher imagem'}
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadInvitationImage(file); event.currentTarget.value = ''; }} disabled={loading || working !== null} />
            </label>
          </div>
          <small className="field-help">PNG, JPG, GIF ou WEBP.</small>
        </div>

        <button className="primary-button settings-save" disabled={saving || loading} onClick={saveSettings}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      <div className="instance-management">
        <div className="instance-header">
          <div>
            <p className="eyebrow">WhatsApp</p>
            <h3>Instâncias da Evolution API</h3>
          </div>
          <div className="instance-create-row">
            <input
              value={newInstanceName}
              onChange={(event) => setNewInstanceName(event.target.value)}
              placeholder="nome-da-instancia"
              disabled={loading}
            />
            <button className="primary-button" disabled={loading || working !== null} onClick={createInstance}>
              {working ? 'Criando...' : 'Criar instância'}
            </button>
          </div>
        </div>

        {instances.length === 0 ? (
          <div className="instance-empty-state">
            <p className="muted">Nenhuma instância criada ainda.</p>
            <p className="muted">Crie uma instância e depois use o botão “Ler QR” para capturar o código de conexão.</p>
          </div>
        ) : (
          <div className="instance-list">
            {instances.map((instance) => (
              <div key={instance.name} className={`instance-row ${instance.active ? 'active' : ''}`}>
                <div className="instance-meta">
                  <strong>{instance.name}</strong>
                  <span>Status: {instance.status}</span>
                  {instance.owner && <span>Proprietário: {instance.owner}</span>}
                </div>

                <div className="instance-actions">
                  <button
                    className="ghost-button"
                    disabled={instance.active || working !== null}
                    onClick={() => activateInstance(instance.name)}
                  >
                    {instance.active ? 'Ativa' : 'Ativar'}
                  </button>
                  <button className="ghost-button" disabled={working !== null} onClick={() => readQrCode(instance.name)}>
                    Ler QR
                  </button>
                  <button className="ghost-button" disabled={working !== null} onClick={() => testConnection(instance.name)}>
                    {working === `connection-${instance.name}` ? 'Testando...' : 'Testar conexão'}
                  </button>
                  <button className="ghost-button" disabled={working !== null} onClick={() => disconnectInstance(instance.name, 'logout')}>
                    Logout
                  </button>
                  <button className="ghost-button danger-button" disabled={working !== null} onClick={() => disconnectInstance(instance.name, 'delete')}>
                    Excluir
                  </button>
                </div>

                {qrCodes[instance.name] && (
                  <div className="instance-qr">
                    {qrCodes[instance.name].startsWith('data:image') || qrCodes[instance.name].startsWith('http') ? (
                      <img src={qrCodes[instance.name]} alt={`QR Code da instância ${instance.name}`} className="instance-qr-image" />
                    ) : (
                      <code className="instance-qr-value">{qrCodes[instance.name]}</code>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
