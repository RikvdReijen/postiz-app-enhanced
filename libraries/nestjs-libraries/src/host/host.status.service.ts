import { Injectable } from '@nestjs/common';
import { Connection } from '@temporalio/client';
import { HostRepository } from '@gitroom/nestjs-libraries/database/prisma/host/host.repository';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';

export type ServiceStatus = 'up' | 'down';

const TEMPORAL_TIMEOUT_MS = 5000;

/**
 * "Is the host up?" as the phone asks it.
 *
 * A self-hosted PostPls usually lives on a desktop that gets switched off, so
 * the Android app needs a cheap, unauthenticated way to tell "the machine is
 * off" from "the machine is on but something is broken".
 */
@Injectable()
export class HostStatusService {
  constructor(private _hostRepository: HostRepository) {}

  /** Cheap enough to poll, and says nothing about who the host belongs to. */
  getPublicStatus() {
    return {
      brand: BRAND_NAME,
      online: true,
      version: process.env.POSTPLS_VERSION || null,
      checkedAt: new Date().toISOString(),
    };
  }

  async getHealth() {
    const [database, orchestrator] = await Promise.all([
      this.checkDatabase(),
      this.checkOrchestrator(),
    ]);

    return {
      ...this.getPublicStatus(),
      services: {
        api: 'up' as ServiceStatus,
        database,
        orchestrator,
      },
      // The API answering is not enough to promise anything will publish, so
      // the indicator degrades instead of showing a flat green.
      healthy: database === 'up' && orchestrator === 'up',
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this._hostRepository.checkConnection();
      return 'up';
    } catch (err) {
      return 'down';
    }
  }

  private async checkOrchestrator(): Promise<ServiceStatus> {
    let connection: Connection | undefined;
    try {
      connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        ...(process.env.TEMPORAL_TLS === 'true' ? { tls: true } : {}),
        ...(process.env.TEMPORAL_API_KEY
          ? { apiKey: process.env.TEMPORAL_API_KEY }
          : {}),
      });

      await Promise.race([
        connection.workflowService.describeNamespace({
          namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TEMPORAL_TIMEOUT_MS)
        ),
      ]);

      return 'up';
    } catch (err) {
      return 'down';
    } finally {
      await connection?.close().catch(() => {});
    }
  }
}
