import { Injectable } from '@nestjs/common';
import { QuickAccessRepository } from '@gitroom/nestjs-libraries/database/prisma/quick-access/quick.access.repository';
import { QuickAccessTagDto } from '@gitroom/nestjs-libraries/dtos/quick-access/quick.access.dto';
import {
  quickAccessRoute,
  quickAccessScanUrl,
} from '@gitroom/helpers/branding/quick.access.link';

@Injectable()
export class QuickAccessService {
  constructor(private _quickAccessRepository: QuickAccessRepository) {}

  async getTags(orgId: string) {
    const tags = await this._quickAccessRepository.getTags(orgId);

    return tags.map((tag) => ({
      ...tag,
      url: quickAccessScanUrl(process.env.FRONTEND_URL || '', tag.id),
    }));
  }

  upsertTag(orgId: string, body: QuickAccessTagDto) {
    return this._quickAccessRepository.upsertTag(orgId, body);
  }

  deleteTag(orgId: string, id: string) {
    return this._quickAccessRepository.deleteTag(orgId, id);
  }

  /**
   * Turns a scanned tag into the screen it should open. Scans are counted here
   * rather than on the client so a printed sticker reports accurately even when
   * the scan came from a browser that never loads the app.
   */
  async resolveTag(id: string) {
    const tag = await this._quickAccessRepository.resolveTag(id);
    if (!tag) {
      return null;
    }

    await this._quickAccessRepository.recordScan(id);

    return {
      id: tag.id,
      target: tag.target,
      integrationId: tag.integrationId,
      providerIdentifier: tag.providerIdentifier,
      route: quickAccessRoute({
        target: tag.target,
        integrationId: tag.integrationId,
        providerIdentifier: tag.providerIdentifier,
      }),
    };
  }
}
