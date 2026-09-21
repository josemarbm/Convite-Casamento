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
});