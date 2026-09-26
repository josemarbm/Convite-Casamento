import { buildApp } from './app.js';
import { getConfig } from './config.js';
import { db } from './lib/db.js';
import { EvolutionClient } from './lib/evolution-client.js';
import { SchedulerService } from './modules/scheduler/service.js';

const { host, port } = getConfig();
const evolutionClient = new EvolutionClient({ baseUrl: process.env.EVOLUTION_API_URL ?? 'http://127.0.0.1:8080', apiKey: process.env.EVOLUTION_API_KEY ?? '12345' });
const scheduler = new SchedulerService({
  db,
  client: evolutionClient,
  sessionId: async () => (await db.setting.findUnique({ where: { key: 'evolution_session_id' } }))?.value ?? process.env.EVOLUTION_SESSION_ID ?? '',
});
const app = buildApp({ evolutionClient, scheduler });

try {
  try {
    await scheduler.loadPendingSchedules();
  } catch (error) {
    app.log.warn({ error }, 'Could not load pending schedules during startup; the application will continue and retry on the next restart.');
  }
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown() {
  scheduler.shutdown();
  await app.close();
  await db.$disconnect();
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });