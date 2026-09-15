import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { QuickAccessTagDto } from '@gitroom/nestjs-libraries/dtos/quick-access/quick.access.dto';

@Injectable()
export class QuickAccessRepository {
  constructor(private _quickAccessTag: PrismaRepository<'quickAccessTag'>) {}

  getTags(orgId: string) {
    return this._quickAccessTag.model.quickAccessTag.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: {
        integration: {
          select: { id: true, name: true, picture: true, providerIdentifier: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getTag(orgId: string, id: string) {
    return this._quickAccessTag.model.quickAccessTag.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  upsertTag(orgId: string, body: QuickAccessTagDto) {
    const data = {
      name: body.name,
      target: body.target,
      integrationId: body.integrationId || null,
      providerIdentifier: body.providerIdentifier || null,
      logo: body.logo || null,
      accentColor: body.accentColor || null,
    };

    return this._quickAccessTag.model.quickAccessTag.upsert({
      // Scoped to the organization so a known tag id from another workspace
      // cannot be re-pointed through this endpoint.
      where: { id: body.id || '', organizationId: orgId },
      create: { organizationId: orgId, ...data },
      update: data,
      select: { id: true },
    });
  }

  deleteTag(orgId: string, id: string) {
    return this._quickAccessTag.model.quickAccessTag.updateMany({
      where: { id, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Resolved without an organization: a scan arrives from a printed sticker or
   * an NFC tag, so there is no session yet. Only the destination is returned,
   * never anything about the organization itself.
   */
  resolveTag(id: string) {
    return this._quickAccessTag.model.quickAccessTag.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        target: true,
        integrationId: true,
        providerIdentifier: true,
      },
    });
  }

  recordScan(id: string) {
    return this._quickAccessTag.model.quickAccessTag.updateMany({
      where: { id, deletedAt: null },
      data: { scans: { increment: 1 }, lastScannedAt: new Date() },
    });
  }
}
