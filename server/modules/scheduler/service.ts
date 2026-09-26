import type { PrismaClient } from '@prisma/client';
import { EvolutionClient } from '../../lib/evolution-client.js';
import { sendDirect } from '../sending/service.js';

type Options = {
  db: PrismaClient;
  client: EvolutionClient;
  sessionId: () => Promise<string>;
};

export class SchedulerService {
  private readonly timers = new Map<number, NodeJS.Timeout>();

  constructor(private readonly options: Options) {}

  scheduleSend(id: number, scheduledTime: Date) {
    this.cancelTimer(id);
    const delay = Math.max(0, scheduledTime.getTime() - Date.now());
    const timer = setTimeout(() => { void this.execute(id); }, delay);
    this.timers.set(id, timer);
  }

  cancelTimer(id: number) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }

  async execute(id: number) {
    this.cancelTimer(id);
    const scheduled = await this.options.db.scheduledSend.findUnique({ where: { id } });
    if (!scheduled || scheduled.status !== 'pending') return;

    try {
      const guestIds = scheduled.guestIds ? JSON.parse(scheduled.guestIds) as number[] : [];
      await sendDirect({
        db: this.options.db,
        client: this.options.client,
        sessionId: await this.options.sessionId(),
        templateId: scheduled.templateId,
        guestIds,
        groupId: scheduled.groupId,
      });
      await this.options.db.scheduledSend.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } });
    } catch {
      await this.options.db.scheduledSend.update({ where: { id }, data: { status: 'failed', completedAt: new Date() } });
    }
  }

  async loadPendingSchedules() {
    const pending = await this.options.db.scheduledSend.findMany({ where: { status: 'pending' } });
    const now = Date.now();
    for (const scheduled of pending) {
      if (scheduled.scheduledTime.getTime() <= now) {
        await this.options.db.scheduledSend.update({ where: { id: scheduled.id }, data: { status: 'failed' } });
      } else {
        this.scheduleSend(scheduled.id, scheduled.scheduledTime);
      }
    }
  }

  shutdown() {
    for (const id of this.timers.keys()) this.cancelTimer(id);
  }
}