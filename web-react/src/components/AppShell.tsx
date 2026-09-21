import type { ReactNode } from 'react';

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
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">C</span>
          <div>
            <strong>Convites</strong>
            <span>Gabriela & Josemar</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate(item.id)}
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
            <strong>Convites</strong>
          </div>
          <button className="mobile-account" type="button" onClick={onLogout} aria-label="Sair da conta">
            {username?.slice(0, 1).toUpperCase() ?? 'A'}
          </button>
        </header>
        <nav className="mobile-nav" aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeSection === item.id ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              {item.shortLabel}
            </button>
          ))}
        </nav>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
