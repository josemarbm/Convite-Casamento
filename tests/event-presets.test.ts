import { describe, expect, it } from 'vitest';
import { EVENT_TYPES, getEventTemplatePreset } from '../server/modules/events/presets.js';

describe('event invitation presets', () => {
  it('supports the agreed event types', () => {
    expect(EVENT_TYPES).toEqual(['wedding', 'birthday', 'graduation', 'baptism', 'other']);
  });

  it('provides editable templates with generic event and RSVP placeholders', () => {
    const presets = EVENT_TYPES.map((eventType) => getEventTemplatePreset(eventType));

    expect(new Set(presets.map((preset) => preset.content)).size).toBe(EVENT_TYPES.length);
    for (const preset of presets) {
      expect(preset.content).toContain('{nome}');
      expect(preset.content).toContain('{event_name}');
      expect(preset.content).toContain('{hosts}');
      expect(preset.content).toContain('{rsvp_url}');
    }
  });
});