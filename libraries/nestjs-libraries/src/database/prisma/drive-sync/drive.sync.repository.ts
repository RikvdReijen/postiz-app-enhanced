import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { SyncPost } from '@gitroom/helpers/sync/sync.bundle';

@Injectable()
export class DriveSyncRepository {
  constructor(
    private _driveSyncState: PrismaRepository<'driveSyncState'>,
    private _post: PrismaRepository<'post'>
  ) {}

  getState(orgId: string) {
    return this._driveSyncState.model.driveSyncState.findUnique({
      where: { organizationId: orgId },
    });
  }

  connect(
    orgId: string,
    data: { accountEmail: string; refreshToken: string; folderId: string }
  ) {
    return this._driveSyncState.model.driveSyncState.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        enabled: true,
        lastError: null,
        ...data,
      },
      update: {
        enabled: true,
        lastError: null,
        ...data,
      },
    });
  }

  disconnect(orgId: string) {
    return this._driveSyncState.model.driveSyncState.update({
      where: { organizationId: orgId },
      data: {
        enabled: false,
        refreshToken: null,
        bundleFileId: null,
        folderId: null,
        accountEmail: null,
        lastError: null,
      },
    });
  }

  setEnabled(orgId: string, enabled: boolean) {
    return this._driveSyncState.model.driveSyncState.update({
      where: { organizationId: orgId },
      data: { enabled },
    });
  }

  saveSyncResult(
    orgId: string,
    data: {
      bundleFileId?: string;
      revision?: number;
      lastPulledAt?: Date;
      lastPushedAt?: Date;
      lastError?: string | null;
    }
  ) {
    return this._driveSyncState.model.driveSyncState.update({
      where: { organizationId: orgId },
      data,
    });
  }

  /**
   * Top-level posts only. Thread children ride along with their parent when the
   * host publishes, and a phone has no useful way to edit them in isolation.
   */
  getSyncablePosts(orgId: string, from: Date, to: Date) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        parentPostId: null,
        publishDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        group: true,
        content: true,
        publishDate: true,
        state: true,
        updatedAt: true,
        deletedAt: true,
        integrationId: true,
        integration: { select: { providerIdentifier: true } },
      },
      orderBy: { publishDate: 'asc' },
    });
  }

  getPostsByIds(orgId: string, ids: string[]) {
    return this._post.model.post.findMany({
      where: { organizationId: orgId, id: { in: ids } },
      select: {
        id: true,
        group: true,
        state: true,
        updatedAt: true,
        deletedAt: true,
        publishDate: true,
        integrationId: true,
        integration: { select: { providerIdentifier: true } },
      },
    });
  }

  /**
   * Posts authored on the phone always land as DRAFT: the host stays the only
   * thing that decides something is ready to go out.
   */
  createDraftFromSync(orgId: string, post: SyncPost) {
    return this._post.model.post.create({
      data: {
        id: post.id,
        organizationId: orgId,
        integrationId: post.integrationId!,
        group: post.group,
        content: post.content,
        publishDate: new Date(post.publishDate),
        state: 'DRAFT',
        creationMethod: 'API',
      },
      select: { id: true },
    });
  }

  updateContentFromSync(orgId: string, id: string, content: string) {
    return this._post.model.post.updateMany({
      where: { id, organizationId: orgId },
      data: { content },
    });
  }

  updateDraftFromSync(
    orgId: string,
    id: string,
    data: { content: string; publishDate: Date }
  ) {
    return this._post.model.post.updateMany({
      where: { id, organizationId: orgId, state: 'DRAFT' },
      data,
    });
  }

  softDeleteDraft(orgId: string, id: string) {
    return this._post.model.post.updateMany({
      where: { id, organizationId: orgId, state: 'DRAFT' },
      data: { deletedAt: new Date() },
    });
  }
}
