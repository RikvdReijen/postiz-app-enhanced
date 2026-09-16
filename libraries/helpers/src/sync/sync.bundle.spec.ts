import {
  emptySyncBundle,
  mergeSyncBundles,
  parseSyncBundle,
  SyncBundle,
  SyncPost,
  SYNC_BUNDLE_VERSION,
} from './sync.bundle';

const post = (overrides: Partial<SyncPost> = {}): SyncPost => ({
  id: 'post-1',
  group: 'group-1',
  integrationId: 'integration-1',
  providerIdentifier: 'mastodon',
  content: 'hello',
  publishDate: '2026-01-01T10:00:00.000Z',
  state: 'DRAFT',
  updatedAt: '2026-01-01T09:00:00.000Z',
  deletedAt: null,
  origin: 'host',
  ...overrides,
});

const bundle = (posts: SyncPost[], overrides: Partial<SyncBundle> = {}): SyncBundle => ({
  ...emptySyncBundle('org-1', 'host'),
  posts,
  ...overrides,
});

describe('mergeSyncBundles', () => {
  it('adds a post that only the remote side has', () => {
    const remoteOnly = post({ id: 'remote-1', origin: 'mobile' });
    const { bundle: merged, changed } = mergeSyncBundles(
      bundle([]),
      bundle([remoteOnly]),
      'host'
    );

    expect(merged.posts).toHaveLength(1);
    expect(changed).toEqual([remoteOnly]);
  });

  it('keeps the local post when it was edited more recently', () => {
    const local = post({ content: 'newer', updatedAt: '2026-01-01T12:00:00.000Z' });
    const remote = post({ content: 'older', updatedAt: '2026-01-01T11:00:00.000Z' });

    const { bundle: merged, changed } = mergeSyncBundles(
      bundle([local]),
      bundle([remote]),
      'host'
    );

    expect(merged.posts[0].content).toBe('newer');
    // Nothing to write back when the local side already won.
    expect(changed).toHaveLength(0);
  });

  it('takes the remote post when it was edited more recently', () => {
    const local = post({ content: 'older', updatedAt: '2026-01-01T11:00:00.000Z' });
    const remote = post({ content: 'newer', updatedAt: '2026-01-01T12:00:00.000Z' });

    const { bundle: merged, changed } = mergeSyncBundles(
      bundle([local]),
      bundle([remote]),
      'host'
    );

    expect(merged.posts[0].content).toBe('newer');
    expect(changed).toHaveLength(1);
  });

  it('lets a delete win over an edit made at the same instant', () => {
    const at = '2026-01-01T12:00:00.000Z';
    const local = post({ content: 'edited', updatedAt: at });
    const remote = post({ updatedAt: at, deletedAt: at, origin: 'mobile' });

    const { bundle: merged } = mergeSyncBundles(
      bundle([local]),
      bundle([remote]),
      'host'
    );

    expect(merged.posts[0].deletedAt).toBe(at);
  });

  it('resolves an exact tie the same way regardless of which side merges', () => {
    const at = '2026-01-01T12:00:00.000Z';
    const fromHost = post({ content: 'host copy', updatedAt: at, origin: 'host' });
    const fromMobile = post({ content: 'phone copy', updatedAt: at, origin: 'mobile' });

    // Both devices run this merge independently and must agree, or they would
    // bounce edits back and forth forever.
    const onHost = mergeSyncBundles(bundle([fromMobile]), bundle([fromHost]), 'host');
    const onPhone = mergeSyncBundles(bundle([fromHost]), bundle([fromMobile]), 'mobile');

    expect(onHost.bundle.posts[0].content).toBe('host copy');
    expect(onPhone.bundle.posts[0].content).toBe('host copy');
  });

  it('moves the revision past both sides so neither looks newer afterwards', () => {
    const { bundle: merged } = mergeSyncBundles(
      bundle([], { revision: 4 }),
      bundle([], { revision: 9 }),
      'host'
    );

    expect(merged.revision).toBe(10);
  });
});

describe('parseSyncBundle', () => {
  it('reads a bundle it wrote', () => {
    const original = bundle([post()]);
    expect(parseSyncBundle(JSON.stringify(original))).toEqual(original);
  });

  it('refuses a bundle written by a newer client', () => {
    // Accepting it would mean writing back a bundle with the newer client's
    // fields silently dropped.
    const future = bundle([], { version: SYNC_BUNDLE_VERSION + 1 });
    expect(parseSyncBundle(JSON.stringify(future))).toBeNull();
  });

  it('refuses malformed input rather than throwing', () => {
    expect(parseSyncBundle('not json')).toBeNull();
    expect(parseSyncBundle('{}')).toBeNull();
    expect(parseSyncBundle(JSON.stringify({ organizationId: 'org-1' }))).toBeNull();
  });
});
