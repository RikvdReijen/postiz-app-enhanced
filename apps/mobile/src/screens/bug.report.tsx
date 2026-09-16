import { FC, useState } from 'react';
import { Button, Card, Field, TextArea, TextInput } from '@postpls/components/ui';
import { QueuedBugReport } from '@postpls/state/bug.reports';
import { BRAND_NAME, BRAND_UPSTREAM_NAME } from '@gitroom/helpers/branding/branding';

export const BugReportScreen: FC<{
  hostOnline: boolean;
  queued: number;
  diagnostics: Record<string, unknown>;
  onSubmit: (report: QueuedBugReport) => void;
  onCancel: () => void;
}> = ({ hostOnline, queued, diagnostics, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // The app is entirely PostPls' own surface, so a bug raised here defaults to
  // ours — but a wrongly-rendered post preview really is upstream's.
  const [scope, setScope] = useState<'POSTPLS' | 'UPSTREAM'>('POSTPLS');

  const submit = () => {
    onSubmit({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      scope,
      route: 'app',
      platform: 'android',
      diagnostics: JSON.stringify(diagnostics),
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <Card>
        <div className="text-[15px]">Report a bug</div>
        <div className="text-[13px] text-textItemBlur">
          {hostOnline
            ? 'Sent to your host, where it waits for the next batch.'
            : 'Your host is offline — this is saved on the phone and sent on the next sync.'}
          {queued > 0 && ` ${queued} report${queued === 1 ? '' : 's'} still waiting to send.`}
        </div>

        <Field label="What went wrong?">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Calendar empty after syncing"
            autoFocus
          />
        </Field>

        <Field label="What were you doing?">
          <TextArea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps you took, what you expected, what happened instead."
          />
        </Field>

        <Field label="Where does this belong?">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'POSTPLS' | 'UPSTREAM')}
            className="bg-newBgLineColor border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[15px] text-newTextColor outline-none w-full min-w-0"
          >
            <option value="POSTPLS">{BRAND_NAME} — something this fork added</option>
            <option value="UPSTREAM">
              {BRAND_UPSTREAM_NAME} — inherited from upstream
            </option>
          </select>
        </Field>

        <div className="text-[12px] text-textItemBlur">
          Host status, sync state and device details are attached. No post
          content is included.
        </div>

        <div className="flex gap-[10px] justify-end">
          <Button secondary onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !description.trim()}>
            Send report
          </Button>
        </div>
      </Card>
    </div>
  );
};
