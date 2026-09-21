import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  await db.user.upsert({
    where: { username },
    update: {},
    create: { username, email: process.env.ADMIN_EMAIL ?? 'admin@casamento.com', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin123', 12) },
  });
  await db.messageTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Convite Padrão', content: 'Querido(a) {nome}, confirme sua presença: {confirmacao_url}', isDefault: true },
  });
  for (const [key, value] of Object.entries({
    evolution_api_url: process.env.EVOLUTION_API_URL ?? 'http://127.0.0.1:8080',
    evolution_api_key: process.env.EVOLUTION_API_KEY ?? '12345',
    evolution_session_id: process.env.EVOLUTION_SESSION_ID ?? 'default',
    couple_name: process.env.COUPLE_NAME ?? 'Gabriela & Josemar',
  })) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}

main().finally(() => db.$disconnect());