import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { db } from './lib/db.js';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { registerGuestsRoutes } from './modules/guests/routes.js';
import { registerRsvpRoutes } from './modules/rsvp/routes.js';
import { registerGroupRoutes } from './modules/groups/routes.js';
import { registerTemplateRoutes } from './modules/templates/routes.js';
import { registerSettingsRoutes } from './modules/settings/routes.js';
import { registerEvolutionRoutes } from './modules/evolution/routes.js';
import { EvolutionClient } from './lib/evolution-client.js';
import { registerSendingRoutes } from './modules/sending/routes.js';
import multipart from '@fastify/multipart';
import { registerUploadRoutes } from './modules/uploads/routes.js';

type AppOptions = {
  db?: typeof db;
  jwtSecret?: string;
  evolutionClient?: EvolutionClient;
  scheduler?: { scheduleSend: (id: number, time: Date) => void; cancelTimer: (id: number) => void };
};

export function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: false });
  app.register(multipart, { limits: { fileSize: 16 * 1024 * 1024, files: 1 } });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/health', async () => ({ status: 'ok' }));
  void registerAuthRoutes(app, {
    db: options.db ?? db,
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret',
  });
  void registerGuestsRoutes(app, {
    db: options.db ?? db,
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret',
  });
  void registerRsvpRoutes(app, { db: options.db ?? db });
  void registerGroupRoutes(app, { db: options.db ?? db, jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret' });
  void registerTemplateRoutes(app, { db: options.db ?? db, jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret' });
  void registerSettingsRoutes(app, { db: options.db ?? db, jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret' });
  void registerEvolutionRoutes(app, {
    db: options.db ?? db,
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret',
    client: options.evolutionClient ?? new EvolutionClient({
      baseUrl: process.env.EVOLUTION_API_URL ?? 'http://127.0.0.1:8080',
      apiKey: process.env.EVOLUTION_API_KEY ?? '12345',
    }),
  });
  void registerSendingRoutes(app, {
    db: options.db ?? db,
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret',
    client: options.evolutionClient ?? new EvolutionClient({ baseUrl: process.env.EVOLUTION_API_URL ?? 'http://127.0.0.1:8080', apiKey: process.env.EVOLUTION_API_KEY ?? '12345' }),
    scheduler: options.scheduler,
  });
  void registerUploadRoutes(app, { db: options.db ?? db, jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? 'change-this-secret' });

  const publicDirectory = path.resolve(process.cwd(), 'dist/public');
  if (existsSync(publicDirectory)) {
    app.register(fastifyStatic, { root: publicDirectory });
    app.get('/', async (_request, reply) => reply.sendFile('index.html'));
    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }

      return reply.code(404).send({ error: 'Not found' });
    });
  }

  return app;
}