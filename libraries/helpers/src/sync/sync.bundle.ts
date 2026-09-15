/**
 * The PostPls sync bundle.
 *
 * A single JSON document that lives in the user's Google Drive and is read and
 * written by both the host and the Android app. Drive is only a dumb transport:
 * whoever writes last uploads a full bundle, and both sides merge with the same
 * rules so the phone can keep working while the host is powered off.
 *
 * This file is imported by the backend and by the mobile app, so it must stay
 * free of Node and browser specific APIs.
 */

export const SYNC_BUNDLE_VERSION = 1;
export const SYNC_BUNDLE_FILE_NAME = 'postpls-sync.json';

export type SyncOrigin = 'host' | 'mobile';

/**
 * Deliberately a subset of the Post model. The bundle carries what a person
 * needs to keep drafting on a phone, not everything the publisher needs — the
 * host remains the source of truth for publishing.
 */
export interface SyncPost {
  id: string;
  group: string;
  integrationId: string | null;
  providerIdentifier: string | null;
  content: string;
  /** ISO-8601, always UTC. */
  publishDate: string;
  state: 'DRAFT' | 'QUEUE' | 'PUBLISHED' | 'ERROR';
  /** ISO-8601, always UTC. Drives conflict resolution. */
  updatedAt: string;
  /** ISO-8601 tombstone, or null when the post is live. */
  deletedAt: string | null;
  origin: SyncOrigin;
}

export interface SyncBundle {
  version: number;
  organizationId: string;
  /** Bumped by every writer so a reader can cheaply detect "nothing changed". */
  revision: number;
  generatedAt: string;
  generatedBy: SyncOrigin;
  posts: SyncPost[];
}

export const emptySyncBundle = (
  organizationId: string,
  generatedBy: SyncOrigin
): SyncBundle => ({
  version: SYNC_BUNDLE_VERSION,
  organizationId,
  revision: 0,
  generatedAt: new Date().toISOString(),
  generatedBy,
  posts: [],
});

/**
 * Parses an untrusted bundle (it came off a file in someone's Drive) and
 * returns null when it is not a bundle we understand, so callers can fall back
 * to their own state instead of throwing.
 */
export const parseSyncBundle = (raw: string): SyncBundle | null => {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.organizationId !== 'string' ||
      !Array.isArray(parsed.posts)
    ) {
      return null;
    }

    if (parsed.version > SYNC_BUNDLE_VERSION) {
      // Written by a newer client than us; refuse rather than silently drop
      // fields we do not understand back out of the bundle.
      return null;
    }

    return parsed as SyncBundle;
  } catch (err) {
    return null;
  }
};

const isNewer = (candidate: SyncPost, current: SyncPost) => {
  if (candidate.updatedAt !== current.updatedAt) {
    return candidate.updatedAt > current.updatedAt;
  }

  // Same timestamp on both sides: a delete beats an edit, otherwise the host
  // wins, so two clients always land on the same answer.
  if (!!candidate.deletedAt !== !!current.deletedAt) {
    return !!candidate.deletedAt;
  }

  return candidate.origin === 'host' && current.origin !== 'host';
};

export interface SyncMergeResult {
  bundle: SyncBundle;
  /** Posts the caller has to write back into its own store. */
  changed: SyncPost[];
}

/**
 * Last-write-wins per post, by `updatedAt`. Both sides run this and reach the
 * same bundle, which is what lets either side upload the result.
 */
export const mergeSyncBundles = (
  local: SyncBundle,
  remote: SyncBundle,
  generatedBy: SyncOrigin
): SyncMergeResult => {
  const merged = new Map<string, SyncPost>();
  for (const post of local.posts) {
    merged.set(post.id, post);
  }

  const changed: SyncPost[] = [];
  for (const post of remote.posts) {
    const current = merged.get(post.id);
    if (!current || isNewer(post, current)) {
      merged.set(post.id, post);
      changed.push(post);
    }
  }

  return {
    bundle: {
      version: SYNC_BUNDLE_VERSION,
      organizationId: local.organizationId || remote.organizationId,
      revision: Math.max(local.revision, remote.revision) + 1,
      generatedAt: new Date().toISOString(),
      generatedBy,
      posts: [...merged.values()],
    },
    changed,
  };
};
