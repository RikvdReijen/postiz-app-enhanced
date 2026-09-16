import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DriveSyncRepository } from '@gitroom/nestjs-libraries/database/prisma/drive-sync/drive.sync.repository';
import { GoogleDriveProvider } from '@gitroom/nestjs-libraries/drive-sync/google.drive.provider';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import {
  emptySyncBundle,
  mergeSyncBundles,
  parseSyncBundle,
  SyncBundle,
  SyncPost,
} from '@gitroom/helpers/sync/sync.bundle';

dayjs.extend(utc);

/** How much of the calendar the phone carries around with it. */
const EXPORT_PAST_DAYS = 7;
const EXPORT_FUTURE_DAYS = 60;

@Injectable()
export class DriveSyncService {
  constructor(
    private _driveSyncRepository: DriveSyncRepository,
    private _googleDriveProvider: GoogleDriveProvider,
    private _postsService: PostsService
  ) {}

  async getState(orgId: string) {
    const state = await this._driveSyncRepository.getState(orgId);

    return {
      configured: this._googleDriveProvider.configured,
      connected: !!state?.refreshToken,
      enabled: !!state?.enabled,
      accountEmail: state?.accountEmail || null,
      revision: state?.revision || 0,
      lastPulledAt: state?.lastPulledAt || null,
      lastPushedAt: state?.lastPushedAt || null,
      lastError: state?.lastError || null,
    };
  }

  generateAuthUrl(orgId: string) {
    return { url: this._googleDriveProvider.generateAuthUrl(orgId) };
  }

  async connect(orgId: string, code: string) {
    const { refreshToken, email } = await this._googleDriveProvider.exchangeCode(
      code
    );
    const folderId = await this._googleDriveProvider.findOrCreateFolder(
      refreshToken
    );

    await this._driveSyncRepository.connect(orgId, {
      accountEmail: email,
      refreshToken,
      folderId,
    });

    return this.sync(orgId);
  }

  disconnect(orgId: string) {
    return this._driveSyncRepository.disconnect(orgId);
  }

  setEnabled(orgId: string, enabled: boolean) {
    return this._driveSyncRepository.setEnabled(orgId, enabled);
  }

  /**
   * One round trip: read what is in Drive, merge it with what the host has,
   * apply the phone's changes locally, and upload the merged bundle back.
   */
  async sync(orgId: string) {
    const state = await this._driveSyncRepository.getState(orgId);
    if (!state?.refreshToken || !state.enabled) {
      return { synced: false, reason: 'not-connected' as const };
    }

    try {
      const bundleFileId =
        state.bundleFileId ||
        (await this._googleDriveProvider.findBundle(
          state.refreshToken,
          state.folderId!
        ));

      const remote = bundleFileId
        ? parseSyncBundle(
            await this._googleDriveProvider.readBundle(
              state.refreshToken,
              bundleFileId
            )
          )
        : null;

      const local = await this.exportBundle(orgId);
      const { bundle, changed } = mergeSyncBundles(
        local,
        remote || emptySyncBundle(orgId, 'mobile'),
        'host'
      );

      const applied = await this.applyIncoming(orgId, changed);

      // Applying the phone's changes moves the host's own state on, so the
      // bundle we upload has to be rebuilt from the database rather than from
      // the in-memory merge, or the next pull would undo what we just wrote.
      const refreshed = applied
        ? { ...(await this.exportBundle(orgId)), revision: bundle.revision }
        : bundle;

      const savedFileId = await this._googleDriveProvider.writeBundle(
        state.refreshToken,
        state.folderId!,
        bundleFileId,
        JSON.stringify(refreshed, null, 2)
      );

      await this._driveSyncRepository.saveSyncResult(orgId, {
        bundleFileId: savedFileId,
        revision: refreshed.revision,
        lastPulledAt: new Date(),
        lastPushedAt: new Date(),
        lastError: null,
      });

      return {
        synced: true as const,
        revision: refreshed.revision,
        applied,
        posts: refreshed.posts.length,
      };
    } catch (err) {
      await this._driveSyncRepository.saveSyncResult(orgId, {
        lastError: err instanceof Error ? err.message : 'Unknown sync error',
      });

      throw err;
    }
  }

  /**
   * The direct path used when the phone can actually reach the host. Same merge
   * rules as the Drive round trip, so a device can switch between the two
   * without the two stores drifting apart.
   */
  async mergeClientBundle(orgId: string, incoming: SyncBundle) {
    const local = await this.exportBundle(orgId);
    const { bundle, changed } = mergeSyncBundles(local, incoming, 'host');
    const applied = await this.applyIncoming(orgId, changed);

    return applied
      ? { ...(await this.exportBundle(orgId)), revision: bundle.revision }
      : bundle;
  }

  async exportBundle(orgId: string): Promise<SyncBundle> {
    const posts = await this._driveSyncRepository.getSyncablePosts(
      orgId,
      dayjs.utc().subtract(EXPORT_PAST_DAYS, 'day').toDate(),
      dayjs.utc().add(EXPORT_FUTURE_DAYS, 'day').toDate()
    );

    return {
      ...emptySyncBundle(orgId, 'host'),
      posts: posts.map(
        (post): SyncPost => ({
          id: post.id,
          group: post.group,
          integrationId: post.integrationId,
          providerIdentifier: post.integration?.providerIdentifier || null,
          content: post.content,
          publishDate: post.publishDate.toISOString(),
          state: post.state as SyncPost['state'],
          updatedAt: post.updatedAt.toISOString(),
          deletedAt: post.deletedAt?.toISOString() || null,
          origin: 'host',
        })
      ),
    };
  }

  /**
   * Writes the phone's edits into the database.
   *
   * Deliberately narrow: the phone may create drafts and edit or delete its own
   * drafts, and may fix the wording of something already queued. Anything that
   * decides *when* a queued post goes out goes through PostsService so the
   * Temporal workflow stays in step; everything else is ignored rather than
   * guessed at.
   */
  private async applyIncoming(orgId: string, incoming: SyncPost[]) {
    const fromMobile = incoming.filter((post) => post.origin === 'mobile');
    if (!fromMobile.length) {
      return 0;
    }

    const existing = await this._driveSyncRepository.getPostsByIds(
      orgId,
      fromMobile.map((post) => post.id)
    );
    const byId = new Map(existing.map((post) => [post.id, post]));

    // A bundle is attacker-controlled input — it came off a file in a Drive we
    // do not own — so an integration id in it is a claim, not a fact.
    const ownedIntegrations =
      await this._driveSyncRepository.getOwnedIntegrationIds(
        orgId,
        fromMobile.flatMap((post) => (post.integrationId ? [post.integrationId] : []))
      );

    let applied = 0;
    for (const post of fromMobile) {
      const current = byId.get(post.id);

      if (!current) {
        // A post drafted on the phone while the host was off.
        if (
          post.deletedAt ||
          !post.integrationId ||
          !ownedIntegrations.has(post.integrationId)
        ) {
          continue;
        }

        await this._driveSyncRepository.createDraftFromSync(orgId, post);
        applied++;
        continue;
      }

      if (current.deletedAt) {
        continue;
      }

      if (post.deletedAt) {
        if (current.state === 'DRAFT') {
          await this._driveSyncRepository.softDeleteDraft(orgId, post.id);
        } else {
          await this._postsService.deletePost(orgId, current.group);
        }
        applied++;
        continue;
      }

      if (current.state === 'DRAFT') {
        await this._driveSyncRepository.updateDraftFromSync(orgId, post.id, {
          content: post.content,
          publishDate: new Date(post.publishDate),
        });
        applied++;
        continue;
      }

      if (current.state === 'QUEUE') {
        await this._driveSyncRepository.updateContentFromSync(
          orgId,
          post.id,
          post.content
        );

        const movedDate =
          current.publishDate.toISOString() !==
          new Date(post.publishDate).toISOString();

        if (movedDate) {
          await this._postsService.changeDate(orgId, post.id, post.publishDate);
        }

        applied++;
      }
    }

    return applied;
  }
}
