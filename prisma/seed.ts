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
    update: { name: 'Convite Padrão', content: `Querido(a) {nome},
📣 CHEGOU O GRANDE MOMENTO!! 🚨
É com muito carinho que enviamos o convite do nosso casamento! 💐 ❤️
Sua presença tornará nosso dia ainda mais especial.
🗓️ Por favor, confirme até 16/12/2025 no link abaixo

👉 Confirmar presença:
http://localhost:3000/rsvp.html?token={token}

🎁 Lista de presentes:
https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&ref=/one-page/home#/lista-de-presentes

🌐 Site do casamento:
http://noivos.casar.com/gabrielaejosemar

💒Local:
https://maps.app.goo.gl/5EXFabhRzoVqHhYP9

Com carinho,
{couple_name} 💍💍`, isDefault: true },
    create: { name: 'Convite Padrão', content: `Querido(a) {nome},
📣 CHEGOU O GRANDE MOMENTO!! 🚨
É com muito carinho que enviamos o convite do nosso casamento! 💐 ❤️
Sua presença tornará nosso dia ainda mais especial.
🗓️ Por favor, confirme até 16/12/2025 no link abaixo

👉 Confirmar presença:
http://localhost:3000/rsvp.html?token={token}

🎁 Lista de presentes:
https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&ref=/one-page/home#/lista-de-presentes

🌐 Site do casamento:
http://noivos.casar.com/gabrielaejosemar

💒Local:
https://maps.app.goo.gl/5EXFabhRzoVqHhYP9

Com carinho,
{couple_name} 💍💍`, isDefault: true },
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