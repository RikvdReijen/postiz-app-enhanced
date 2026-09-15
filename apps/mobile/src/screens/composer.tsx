import { FC, useMemo, useState } from 'react';
import { SyncBundle, SyncPost } from '@gitroom/helpers/sync/sync.bundle';
import { Button, Card, Field, TextArea, TextInput } from '@postpls/components/ui';

/** Local-time value for <input type="datetime-local">, which has no timezone. */
const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const ComposerScreen: FC<{
  bundle: SyncBundle;
  postId: string | null;
  onSave: (post: Omit<SyncPost, 'updatedAt' | 'origin'>) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}> = ({ bundle, postId, onSave, onDelete, onCancel }) => {
  const existing = useMemo(
    () => bundle.posts.find((post) => post.id === postId) || null,
    [bundle.posts, postId]
  );

  const [content, setContent] = useState(existing?.content || '');
  const [publishDate, setPublishDate] = useState(
    toLocalInput(existing?.publishDate || new Date(Date.now() + 3600000).toISOString())
  );
  const [integrationId, setIntegrationId] = useState(
    existing?.integrationId || ''
  );

  /**
   * Accounts are whatever the host has already told this device about. A phone
   * that has never synced cannot invent one, which is also why a brand new
   * draft has to pick from this list.
   */
  const accounts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const post of bundle.posts) {
      if (post.integrationId && !seen.has(post.integrationId)) {
        seen.set(post.integrationId, post.providerIdentifier || 'account');
      }
    }
    return [...seen.entries()];
  }, [bundle.posts]);

  const save = () => {
    const id = existing?.id || crypto.randomUUID();

    onSave({
      id,
      group: existing?.group || id,
      integrationId: integrationId || null,
      providerIdentifier:
        existing?.providerIdentifier ||
        accounts.find(([value]) => value === integrationId)?.[1] ||
        null,
      content,
      publishDate: new Date(publishDate).toISOString(),
      // Anything written here stays a draft; the host decides what publishes.
      state: existing?.state === 'QUEUE' ? 'QUEUE' : 'DRAFT',
      deletedAt: null,
    });
  };

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <Card>
        <Field label="Content">
          <TextArea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What are you posting?"
          />
        </Field>

        <Field label="When">
          <TextInput
            type="datetime-local"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
          />
        </Field>

        <Field label="Account">
          <select
            value={integrationId}
            onChange={(e) => setIntegrationId(e.target.value)}
            className="bg-newBgLineColor border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[15px] text-newTextColor outline-none w-full"
          >
            <option value="">Choose an account…</option>
            {accounts.map(([id, provider]) => (
              <option key={id} value={id}>
                {provider} · {id.slice(0, 8)}
              </option>
            ))}
          </select>
        </Field>

        {existing?.state === 'QUEUE' && (
          <div className="text-[12px] text-textItemBlur">
            This post is already queued on the host. Editing the text or the
            time here reschedules it on the next sync.
          </div>
        )}

        <div className="flex gap-[10px] flex-wrap">
          <Button onClick={save} disabled={!content.trim() || !integrationId}>
            Save
          </Button>
          <Button onClick={onCancel} secondary>
            Cancel
          </Button>
          {!!existing && (
            <Button onClick={() => onDelete(existing.id)} secondary>
              Delete
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
