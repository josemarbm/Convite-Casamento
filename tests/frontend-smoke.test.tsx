import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { getRsvpToken } from '../web-react/src/App';
import SettingsPanel from '../web-react/src/components/SettingsPanel';
import RsvpPage from '../web-react/src/pages/RsvpPage';

describe('frontend smoke', () => {
  it('extracts RSVP tokens from the legacy rsvp.html link', () => {
    expect(getRsvpToken('/rsvp.html', '?token=guest-token')).toBe('guest-token');
  });

  it('renders the public RSVP surface', () => {
    const html = renderToString(<RsvpPage token="guest-token" />);

    expect(html).toContain('Confirmação de presença');
    expect(html).toContain('Carregando convite');
  });

  it('renders the settings panel for the dashboard', () => {
    const html = renderToString(<SettingsPanel />);

    expect(html).toContain('Configurações');
    expect(html).toContain('Evolution API');
    expect(html).toContain('Instâncias da Evolution API');
    expect(html).toContain('Criar instância');
    expect(html).toContain('Ler QR');
    expect(html).not.toContain('Adicionar grupo de convidados');
    expect(html).toContain('Caminho da imagem do convite');
    expect(html).toContain('Escolher imagem');
  });
});
