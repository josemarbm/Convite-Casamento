import type { PrismaClient } from '@prisma/client';
import { EVENT_TYPES, getEventTemplatePreset } from '../server/modules/events/presets.js';

export async function backfillLegacyEvent(db: PrismaClient) {
  const [hostsSetting, imageSetting] = await Promise.all([
    db.setting.findUnique({ where: { key: 'couple_name' } }),
    db.setting.findUnique({ where: { key: 'image_path' } }),
  ]);
  const hosts = hostsSetting?.value.trim() || process.env.COUPLE_NAME?.trim() || 'Gabriela & Josemar';
  const event = await db.event.upsert({
    where: { systemKey: 'legacy-wedding' },
    update: {},
    create: {
      systemKey: 'legacy-wedding',
      name: `Casamento ${hosts}`,
      eventType: 'wedding',
      hosts,
      imagePath: imageSetting?.value ?? null,
    },
  });

  await Promise.all([
    db.guest.updateMany({ where: { eventId: null }, data: { eventId: event.id } }),
    db.group.updateMany({ where: { eventId: null }, data: { eventId: event.id } }),
    db.messageTemplate.updateMany({ where: { eventId: null }, data: { eventId: event.id } }),
    db.scheduledSend.updateMany({ where: { eventId: null }, data: { eventId: event.id } }),
  ]);

  const defaultTemplate = await db.messageTemplate.findFirst({ where: { eventId: event.id, isDefault: true }, orderBy: { id: 'asc' } });
  if (defaultTemplate) {
    await db.messageTemplate.updateMany({
      where: { eventId: event.id, isDefault: true, id: { not: defaultTemplate.id } },
      data: { isDefault: false },
    });
  } else {
    const existingTemplate = await db.messageTemplate.findFirst({ where: { eventId: event.id }, orderBy: { id: 'asc' } });
    if (existingTemplate) {
      await db.messageTemplate.update({ where: { id: existingTemplate.id }, data: { isDefault: true } });
    } else {
      const eventType = EVENT_TYPES.find((type) => type === event.eventType) ?? 'wedding';
      const preset = getEventTemplatePreset(eventType);
      await db.messageTemplate.create({ data: { eventId: event.id, ...preset, isDefault: true } });
    }
  }

  return event;
}