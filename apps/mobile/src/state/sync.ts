import {
  emptySyncBundle,
  mergeSyncBundles,
  SyncBundle,
  SyncPost,
} from '@gitroom/helpers/sync/sync.bundle';
import { readJson, STORAGE_KEYS, writeJson } from '@postpls/state/storage';
import { Pairing } from '@postpls/state/pairing';
import { MobileSettings } from '@postpls/state/settings';
import { HostTransport } from '@postpls/state/host.transport';
import { DriveTransport } from '@postpls/state/drive.transport';

export type SyncRoute = 'host' | 'drive' | 'none';

export interface SyncOutcome {
  route: SyncRoute;
  hostOnline: boolean;
  at: string;
  error?: string;
}

export const loadBundle = (organizationId: string) =>
  readJson<SyncBundle>(
    STORAGE_KEYS.bundle,
    emptySyncBundle(organizationId, 'mobile')
  );

export const saveBundle = (bundle: SyncBundle) =>
  writeJson(STORAGE_KEYS.bundle, bundle);

/**
 * Writes a post into the local bundle.
 *
 * `updatedAt` is stamped here rather than by the caller because it is what the
 * merge uses to decide who wins, and `origin` marks the row as the phone's work
 * so the host knows it is allowed to apply it.
 */
export const upsertLocalPost = async (
  bundle: SyncBundle,
  post: Omit<SyncPost, 'updatedAt' | 'origin'>
): Promise<SyncBundle> => {
  const next: SyncPost = {
    ...post,
    updatedAt: new Date().toISOString(),
    origin: 'mobile',
  };

  const updated: SyncBundle = {
    ...bundle,
    revision: bundle.revision + 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'mobile',
    posts: bundle.posts.some((existing) => existing.id === next.id)
      ? bundle.posts.map((existing) => (existing.id === next.id ? next : existing))
      : [...bundle.posts, next],
  };

  await saveBundle(updated);
  return updated;
};

export const deleteLocalPost = (bundle: SyncBundle, id: string) => {
  const post = bundle.posts.find((existing) => existing.id === id);
  if (!post) {
    return Promise.resolve(bundle);
  }

  return upsertLocalPost(bundle, { ...post, deletedAt: new Date().toISOString() });
};

/**
 * One reconciliation pass.
 *
 * The host wins as a route whenever it answers, because it can apply changes
 * to real posts; Drive is the fallback that makes the app useful when the
 * desktop is off. Both paths run the same merge, so switching between them
 * mid-week does not lose anything.
 */
export const syncNow = async (
  pairing: Pairing,
  settings: MobileSettings
): Promise<SyncOutcome> => {
  const local = await loadBundle(pairing.organizationId);
  const host = new HostTransport(pairing);
  const hostOnline = await host.ping();
  const at = new Date().toISOString();

  if (hostOnline) {
    try {
      const remote = await host.pull();
      const { bundle } = mergeSyncBundles(local, remote, 'mobile');
      const authoritative = await host.push(bundle);
      await saveBundle(authoritative);

      return { route: 'host', hostOnline, at };
    } catch (err) {
      return {
        route: 'none',
        hostOnline,
        at,
        error: err instanceof Error ? err.message : 'Host sync failed',
      };
    }
  }

  if (!settings.driveFallback) {
    return { route: 'none', hostOnline, at };
  }

  try {
    const drive = new DriveTransport();
    const remote = await drive.pull();
    const { bundle } = mergeSyncBundles(
      local,
      remote || emptySyncBundle(pairing.organizationId, 'host'),
      'mobile'
    );

    await drive.push(bundle);
    await saveBundle(bundle);

    return { route: 'drive', hostOnline, at };
  } catch (err) {
    return {
      route: 'none',
      hostOnline,
      at,
      error: err instanceof Error ? err.message : 'Drive sync failed',
    };
  }
};
