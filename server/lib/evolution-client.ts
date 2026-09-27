type EvolutionClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
};

export type EvolutionResult<T> =
  | { success: true; statusCode: number; data: T }
  | { success: false; statusCode?: number; error: string };

export class EvolutionClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: EvolutionClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<EvolutionResult<T>> {
    try {
      const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
        method,
        headers: {
          apikey: this.options.apiKey,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const data = await response.json().catch(() => null) as T;
      if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'message' in data
          ? String(data.message)
          : 'Evolution API request failed';
        return { success: false, statusCode: response.status, error: message };
      }

      return { success: true, statusCode: response.status, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      return { success: false, error: `Não foi possível comunicar com a Evolution API: ${message}` };
    }
  }

  listInstances() {
    return this.request<unknown[]>('GET', 'instance/fetchInstances');
  }

  createInstance(name: string) {
    return this.request('POST', 'instance/create', { instanceName: name, qrcode: true });
  }

  getConnection(name: string) {
    return this.request('GET', `instance/connectionState/${name}`);
  }

  getQrCode(name: string) {
    return this.request('GET', `instance/connect/${name}`);
  }

  logoutInstance(name: string) {
    return this.request('DELETE', `instance/logout/${name}`);
  }

  deleteInstance(name: string) {
    return this.request('DELETE', `instance/delete/${name}`);
  }

  sendText(sessionId: string, phone: string, message: string) {
    return this.request('POST', `message/sendText/${sessionId}`, {
      number: phone,
      options: { delay: 200, presence: 'composing' },
      textMessage: { text: message },
    });
  }

  sendMedia(sessionId: string, phone: string, media: string, mimetype: string, fileName: string, caption: string) {
    return this.request('POST', `message/sendMedia/${sessionId}`, {
      number: phone,
      options: { delay: 200, presence: 'composing' },
      mediaMessage: {
        mediatype: 'image',
        mimetype,
        caption,
        media,
        fileName,
      },
    });
  }
}