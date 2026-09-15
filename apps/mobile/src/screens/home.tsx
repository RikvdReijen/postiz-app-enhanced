import { FC, useMemo } from 'react';
import { SyncBundle } from '@gitroom/helpers/sync/sync.bundle';
import { Button, Card, StatusDot } from '@postpls/components/ui';
import { SyncOutcome } from '@postpls/state/sync';
import { MobileSettings } from '@postpls/state/settings';
import { HostHealth } from '@postpls/state/host.transport';

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const HomeScreen: FC<{
  bundle: SyncBundle;
  health: HostHealth | null;
  outcome: SyncOutcome | null;
  settings: MobileSettings;
  syncing: boolean;
  onSync: () => void;
  onWakeHost: () => void;
  onCompose: () => void;
  onEdit: (id: string) => void;
}> = ({
  bundle,
  health,
  outcome,
  settings,
  syncing,
  onSync,
  onWakeHost,
  onCompose,
  onEdit,
}) => {
  const upcoming = useMemo(
    () =>
      bundle.posts
        .filter((post) => !post.deletedAt && post.state !== 'PUBLISHED')
        .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
        .slice(0, 25),
    [bundle.posts]
  );

  const hostState = !outcome
    ? 'offline'
    : !outcome.hostOnline
    ? 'offline'
    : health && !health.healthy
    ? 'degraded'
    : 'online';

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <Card>
        <div className="flex items-center gap-[10px]">
          <StatusDot state={hostState} />
          <div className="flex-1">
            <div className="text-[15px]">
              {hostState === 'online'
                ? 'Host online'
                : hostState === 'degraded'
                ? 'Host degraded'
                : 'Host offline'}
            </div>
            <div className="text-[12px] text-textItemBlur">
              {outcome
                ? outcome.route === 'host'
                  ? `Synced with the host · ${formatWhen(outcome.at)}`
                  : outcome.route === 'drive'
                  ? `Synced through Google Drive · ${formatWhen(outcome.at)}`
                  : outcome.error || 'Working offline'
                : 'Not synced yet'}
            </div>
          </div>
        </div>

        <div className="flex gap-[10px] flex-wrap">
          <Button onClick={onSync} loading={syncing}>
            Sync now
          </Button>
          <Button onClick={onCompose} secondary>
            New draft
          </Button>
          {hostState === 'offline' && !!settings.hostMacAddress && (
            <Button onClick={onWakeHost} secondary>
              Wake host
            </Button>
          )}
        </div>
      </Card>

      <div className="text-[13px] text-textItemBlur px-[4px]">
        Upcoming ({upcoming.length})
      </div>

      {!upcoming.length ? (
        <Card>
          <div className="text-[14px] text-textItemBlur">
            Nothing scheduled in the window this device carries. Pull down to
            sync, or start a draft.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {upcoming.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onEdit(post.id)}
              className="bg-newBgColorInner rounded-[12px] p-[14px] text-start flex flex-col gap-[6px] active:bg-boxHover"
            >
              <div className="flex justify-between gap-[10px] text-[12px] text-textItemBlur">
                <span>{formatWhen(post.publishDate)}</span>
                <span>
                  {post.state}
                  {post.origin === 'mobile' ? ' · not yet on host' : ''}
                </span>
              </div>
              <div className="text-[14px] line-clamp-3">
                {post.content.replace(/<[^>]*>/g, '') || '(empty)'}
              </div>
              {!!post.providerIdentifier && (
                <div className="text-[12px] text-textItemBlur">
                  {post.providerIdentifier}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
