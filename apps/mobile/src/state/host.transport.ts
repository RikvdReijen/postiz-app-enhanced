import { SyncBundle } from '@gitroom/helpers/sync/sync.bundle';
import { Pairing } from '@postpls/state/pairing';

const PING_TIMEOUT_MS = 4000;

export interface HostHealth {
  healthy: boolean;
  services: { api: string; database: string; orchestrator: string };
}

/**
 * Talks to the host directly. Preferred whenever the machine is actually on,
 * because it is a single round trip and the host is the source of truth.
 */
export class HostTransport {
  constructor(private pairing: Pairing) {}

  private request(path: string, init: RequestInit = {}) {
    return fetch(`${this.pairing.apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        auth: this.pairing.token,
        showorg: this.pairing.organizationId,
        ...(init.headers || {}),
      },
    });
  }

  /**
   * A self-hosted machine that is asleep does not refuse the connection, it
   * simply never answers, so this has to time out rather than wait.
   *
   * The timeout is a race rather than just an AbortController: CapacitorHttp
   * replaces `fetch` with a native implementation so the app is not blocked by
   * the host's CORS policy, and it does not honour `signal`. The controller is
   * still passed so the request is actually cancelled on the web, where this
   * screen runs during development.
   */
  async ping(): Promise<boolean> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const expired = new Promise<false>((resolve) => {
      timeout = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, PING_TIMEOUT_MS);
    });

    try {
      return await Promise.race([
        fetch(`${this.pairing.apiUrl}/host/status`, {
          signal: controller.signal,
        })
          .then((response) => response.ok)
          .catch(() => false),
        expired,
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(): Promise<HostHealth | null> {
    try {
      const response = await this.request('/host/health');
      return response.ok ? ((await response.json()) as HostHealth) : null;
    } catch (err) {
      return null;
    }
  }

  async pull(): Promise<SyncBundle> {
    const response = await this.request('/drive-sync/bundle');
    if (!response.ok) {
      throw new Error(`Host refused the bundle (${response.status})`);
    }

    return (await response.json()) as SyncBundle;
  }

  /** The host merges and hands back the authoritative result. */
  async push(bundle: SyncBundle): Promise<SyncBundle> {
    const response = await this.request('/drive-sync/bundle', {
      method: 'POST',
      body: JSON.stringify(bundle),
    });

    if (!response.ok) {
      throw new Error(`Host rejected the bundle (${response.status})`);
    }

    return (await response.json()) as SyncBundle;
  }
}
