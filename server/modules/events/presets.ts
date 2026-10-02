export const EVENT_TYPES = ['wedding', 'birthday', 'graduation', 'baptism', 'other'] as const;

export type EventType = typeof EVENT_TYPES[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Casamento',
  birthday: 'Aniversário',
  graduation: 'Formatura',
  baptism: 'Batizado',
  other: 'Outro',
};

const presets: Record<EventType, { name: string; content: string }> = {
  // wedding: {
  //   name: 'Convite de casamento',
  //   content: 'Olá, {nome}! Você está convidado(a) para o casamento {event_name}.\n\n{event_date_time}\n{event_location}\n{event_address}\n\nConfirme sua presença: {rsvp_url}\n\nCom carinho,\n{hosts}',
  // },
  wedding: {
    name: 'Convite de casamento',
    content: 'Querido(a) {nome},\n\n📣 CHEGOU O GRANDE MOMENTO!! 🚨\nÉ com muito carinho que enviamos o convite do nosso casamento! 💐 ❤️\nSua presença tornará nosso dia ainda mais especial.\n\n🗓️ Salve a Data {event_date_time}\n\n👉 Confirmar presença:\n{rsvp_url}\n\n🎁 Lista de presentes:\n{gift_list_url}\n\n🌐 Site do casamento:\n{wedding_website_url}\n\n💒Local:\n{event_location}\n{event_address}\n\nCom carinho,\n{hosts} 💍💍',
  },

  birthday: {
    name: 'Convite de aniversário',
    content: 'Oi, {nome}! Vamos comemorar o aniversário de {hosts} e queremos você com a gente!\n\n{event_name}\n{event_date_time}\n{event_location}\n{event_address}\n\nConfirme sua presença: {rsvp_url}',
  },
  graduation: {
    name: 'Convite de formatura',
    content: 'Olá, {nome}! Com muita alegria, convidamos você para celebrar a formatura de {hosts}.\n\n{event_name}\n{event_date_time}\n{event_location}\n{event_address}\n\nConfirme sua presença: {rsvp_url}',
  },
  baptism: {
    name: 'Convite de batizado',
    content: 'Olá, {nome}! Você é nosso convidado especial para celebrar o batizado de {hosts}.\n\n{event_name}\n{event_date_time}\n{event_location}\n{event_address}\n\nConfirme sua presença: {rsvp_url}',
  },
  other: {
    name: 'Convite de evento',
    content: 'Olá, {nome}! Você está convidado(a) para {event_name}.\n\n{event_date_time}\n{event_location}\n{event_address}\n\nConfirme sua presença: {rsvp_url}\n\n{hosts}',
  },
};

export function getEventTemplatePreset(eventType: EventType) {
  return presets[eventType];
}