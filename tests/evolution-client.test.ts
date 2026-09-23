import { describe, expect, it, vi } from 'vitest';
import { EvolutionClient } from '../server/lib/evolution-client.js';

describe('EvolutionClient', () => {
  it('sends the server-side key and expected instance payload', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const client = new EvolutionClient({ baseUrl: 'http://evolution:8080/', apiKey: 'secret', fetcher });

    const result = await client.createInstance('casamento2026');
    const request = fetcher.mock.calls[0];

    expect(result.success).toBe(true);
    expect(request[0]).toBe('http://evolution:8080/instance/create');
    expect(request[1]?.headers).toEqual({ apikey: 'secret', 'Content-Type': 'application/json' });
    expect(request[1]?.body).toBe(JSON.stringify({ instanceName: 'casamento2026', qrcode: true }));
  });

  it('normalizes network failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const client = new EvolutionClient({ baseUrl: 'http://evolution:8080', apiKey: 'secret', fetcher });

    await expect(client.listInstances()).resolves.toMatchObject({
      success: false,
      error: 'Não foi possível comunicar com a Evolution API: offline',
    });
  });

  it('sends an image with a caption', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const client = new EvolutionClient({ baseUrl: 'http://evolution:8080', apiKey: 'secret', fetcher });

    await client.sendMedia('casamento2026', '5511999999999', 'aW1hZ2U=', 'image/jpeg', 'convite.jpg', 'Mensagem do convite');

    expect(fetcher.mock.calls[0]).toEqual([
      'http://evolution:8080/message/sendMedia/casamento2026',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          number: '5511999999999',
          options: { delay: 200, presence: 'composing' },
          mediaMessage: {
            mediatype: 'image',
            mimetype: 'image/jpeg',
            caption: 'Mensagem do convite',
            media: 'aW1hZ2U=',
            fileName: 'convite.jpg',
          },
        }),
      }),
    ]);
  });
});