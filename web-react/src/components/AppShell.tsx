import { useState, type ReactNode } from 'react';
import { useEvents } from '../events/EventProvider';

type NavigationItem = {
  id: string;
  label: string;
  shortLabel: string;
};

const navigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Visão geral', shortLabel: 'Início' },
  { id: 'guests', label: 'Convidados', shortLabel: 'Lista' },
  { id: 'groups', label: 'Grupos', shortLabel: 'Grupos' },
  { id: 'messages', label: 'Mensagens', shortLabel: 'Mensagens' },
  { id: 'events', label: 'Eventos', shortLabel: 'Eventos' },
  { id: 'settings', label: 'Configurações', shortLabel: 'Config.' },
];

type Props = {
  activeSection: string;
  username?: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  children: ReactNode;
};

export default function AppShell({ activeSection, username, onNavigate, onLogout, children }: Props) {
  const { events, activeEvent, selectEvent } = useEvents();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const mobilePrimaryItems = navigationItems.filter((item) => ['overview', 'guests', 'messages'].includes(item.id));
  const mobileSecondaryItems = navigationItems.filter((item) => ['groups', 'events', 'settings'].includes(item.id));
  function navigate(section: string) {
    setMobileMoreOpen(false);
    onNavigate(section);
  }
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">C</span>
          <div>
            <strong>Convites</strong>
            <span>{activeEvent?.name ?? 'Nenhum evento ativo'}</span>
          </div>
        </div>
        <label className="event-context-select"><span>Evento ativo</span><select aria-label="Evento ativo" value={activeEvent?.id ?? ''} onChange={(event) => selectEvent(Number(event.target.value))}><option value="" disabled>Selecione um evento</option>{events.map((event) => <option value={event.id} key={event.id}>{event.name}</option>)}</select></label>
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <span className="nav-item-indicator" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-caption">Sessão ativa</span>
          <strong>{username ?? 'Administrador'}</strong>
          <button className="sidebar-logout" type="button" onClick={onLogout}>Sair da conta</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-topbar">
          <div className="brand-lockup compact">
            <span className="brand-mark" aria-hidden="true">C</span>
            <strong>{activeEvent?.name ?? 'Convites'}</strong>
          </div>
          <button className="mobile-account" type="button" onClick={onLogout} aria-label="Sair da conta">
            {username?.slice(0, 1).toUpperCase() ?? 'A'}
          </button>
        </header>
        <label className="event-context-select mobile-event-context"><span>Evento ativo</span><select aria-label="Evento ativo" value={activeEvent?.id ?? ''} onChange={(event) => selectEvent(Number(event.target.value))}><option value="" disabled>Selecione um evento</option>{events.map((event) => <option value={event.id} key={event.id}>{event.name}</option>)}</select></label>
        <nav className="mobile-nav" aria-label="Navegação principal">
          {mobilePrimaryItems.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              {item.shortLabel}
            </button>
          ))}
          <button className={`mobile-nav-item mobile-more-toggle ${mobileMoreOpen ? 'active' : ''}`} type="button" aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen((open) => !open)}>Mais</button>
        </nav>
        {mobileMoreOpen && <nav className="mobile-more-menu" aria-label="Mais áreas"><span className="mobile-more-title">Organização</span>{mobileSecondaryItems.map((item) => <button key={item.id} className={`mobile-more-item ${activeSection === item.id ? 'active' : ''}`} type="button" onClick={() => navigate(item.id)}>{item.label}</button>)}<button className="mobile-more-item logout" type="button" onClick={onLogout}>Sair da conta</button></nav>}
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
