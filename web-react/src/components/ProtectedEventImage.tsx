import { useEffect, useState } from 'react';
import { ACTIVE_EVENT_KEY } from '../api/client';

type Props = {
  className?: string;
  alt: string;
  eventId?: number | null;
};

export default function ProtectedEventImage({ className, alt, eventId }: Props) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('auth_token');
    const selectedEventId = eventId ? String(eventId) : localStorage.getItem(ACTIVE_EVENT_KEY);
    fetch('/api/images/preview', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(selectedEventId ? { 'X-Event-Id': selectedEventId } : {}),
      },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.blob() : null)
      .then((blob) => { if (blob) setSrc(URL.createObjectURL(blob)); })
      .catch(() => undefined);

    return () => {
      controller.abort();
      setSrc((current) => { if (current) URL.revokeObjectURL(current); return ''; });
    };
  }, [eventId]);

  return src ? <img className={className} src={src} alt={alt} /> : null;
}
