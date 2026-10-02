import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { getRsvpToken } from '../web-react/src/App';
import SettingsPanel from '../web-react/src/components/SettingsPanel';
import EventOverview from '../web-react/src/components/EventOverview';
import GuestList from '../web-react/src/components/GuestList';
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

  it('offers a resend action for each guest', () => {
    const html = renderToString(<GuestList
      guests={[{ id: 2, name: 'João', phone: '55119999', group_id: null, group_name: null, status: 'sent', rsvp_status: 'pending' }]}
      loading={false}
      workingId={null}
      resendingId={null}
      sendingAll={false}
      onEdit={() => {}}
      onDelete={() => {}}
      onResend={() => {}}
    />);

    expect(html).toContain('Reenviar convite');
  });

  it('does not offer a resend action for pending invitations', () => {
    const html = renderToString(<GuestList
      guests={[{ id: 2, name: 'João', phone: '55119999', group_id: null, group_name: null, status: 'pending', rsvp_status: 'pending' }]}
      loading={false}
      workingId={null}
      resendingId={null}
      sendingAll={false}
      onEdit={() => {}}
      onDelete={() => {}}
      onResend={() => {}}
    />);

    expect(html).not.toContain('Reenviar convite');
  });

  it('renders a cross-event overview without the guest management form', () => {
    const html = renderToString(<EventOverview
      events={[{
        id: 8,
        name: 'Festa da Ana',
        event_type: 'birthday',
        event_type_label: 'Aniversário',
        custom_type: null,
        hosts: 'Ana',
        date_time: '2027-04-03T19:00:00.000Z',
        location: 'Salão Azul',
        address: null,
        image_path: null,
        archived_at: null,
        created_at: '2026-10-02T00:00:00.000Z',
        guest_count: 8,
        confirmed_count: 4,
        pending_rsvp_count: 3,
        declined_count: 1,
      }]}
      activeEventId={8}
      loading={false}
      error=""
      onOpenEvent={() => {}}
      onCreateEvent={() => {}}
      onRetry={() => {}}
    />);

    expect(html).toContain('Eventos ativos');
    expect(html).toContain('Aguardando RSVP');
    expect(html).toContain('Festa da Ana');
    expect(html).toContain('Abrir convidados');
    expect(html).not.toContain('Adicionar convidado');
  });

  it('renders the settings panel for the dashboard', () => {
    const html = renderToString(<SettingsPanel />);

    expect(html).toContain('Configurações');
    expect(html).toContain('Evolution API');
    expect(html).toContain('Instâncias da Evolution API');
    expect(html).toContain('Criar instância');
    expect(html).toContain('Ler QR');
    expect(html).not.toContain('Adicionar grupo de convidados');
    expect(html).not.toContain('Nome dos noivos');
    expect(html).not.toContain('Caminho da imagem do convite');
  });
});
