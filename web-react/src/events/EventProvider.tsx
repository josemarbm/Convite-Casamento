import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ACTIVE_EVENT_KEY, apiRequest } from '../api/client';

export type ManagedEvent = {
  id: number;
  name: string;
  event_type: string;
  event_type_label: string;
  custom_type: string | null;
  hosts: string | null;
  date_time: string | null;
  location: string | null;
  address: string | null;
  image_path: string | null;
  archived_at: string | null;
  created_at: string;
  guest_count?: number;
  confirmed_count?: number;
  pending_rsvp_count?: number;
  declined_count?: number;
};

type EventContextValue = {
  events: ManagedEvent[];
  activeEvent: ManagedEvent | null;
  loading: boolean;
  error: string;
  refreshEvents: () => Promise<void>;
  selectEvent: (eventId: number) => void;
};

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<number | null>(() => {
    const stored = localStorage.getItem(ACTIVE_EVENT_KEY);
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refreshEvents() {
    setLoading(true);
    try {
      setEvents(await apiRequest<ManagedEvent[]>('/events'));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os eventos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshEvents(); }, []);

  useEffect(() => {
    if (loading) return;
    const selected = events.find((event) => event.id === activeEventId) ?? events[0] ?? null;
    if (!selected) {
      localStorage.removeItem(ACTIVE_EVENT_KEY);
      setActiveEventId(null);
      return;
    }
  if (selected.id !== activeEventId) setActiveEventId(selected.id);
    localStorage.setItem(ACTIVE_EVENT_KEY, String(selected.id));
  }, [events, activeEventId, loading]);

  function selectEvent(eventId: number) {
    localStorage.setItem(ACTIVE_EVENT_KEY, String(eventId));
    setActiveEventId(eventId);
  }

  const activeEvent = events.find((event) => event.id === activeEventId) ?? null;
  return <EventContext.Provider value={{ events, activeEvent, loading, error, refreshEvents, selectEvent }}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) throw new Error('useEvents must be used inside EventProvider');
  return context;
}
