'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { BugScope } from '@prisma/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Textarea } from '@gitroom/react/form/textarea';
import { Select } from '@gitroom/react/form/select';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  BRAND_NAME,
  BRAND_UPSTREAM_NAME,
} from '@gitroom/helpers/branding/branding';

/**
 * Screens PostPls added on top of Postiz. A report raised on one of these is
 * almost certainly ours, so the scope selector starts there — but the reporter
 * can always override it, because only they saw what broke.
 */
const POSTPLS_ROUTES = ['/settings/drive-sync', '/q/'];
const POSTPLS_QUERY_TABS = [
  'drive_sync',
  'planner',
  'quick_access',
  'mobile_app',
  'bug_reports',
];

export const suggestScope = (route: string): BugScope =>
  POSTPLS_ROUTES.some((prefix) => route.startsWith(prefix)) ||
  POSTPLS_QUERY_TABS.some((tab) => route.includes(tab))
    ? 'POSTPLS'
    : 'UPSTREAM';

/**
 * Collected automatically so a report is actionable without a conversation.
 * Nothing here is content — no post text, no tokens, no account identifiers.
 */
const collectDiagnostics = async (fetch: ReturnType<typeof useFetch>) => {
  const diagnostics: Record<string, unknown> = {
    at: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    language: typeof navigator !== 'undefined' ? navigator.language : null,
    viewport:
      typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Best effort: a report from a host that is half down is exactly the report
  // worth keeping, so a failure here must never block submission.
  try {
    diagnostics.host = await (await fetch('/host/health')).json();
  } catch (err) {
    diagnostics.host = 'unreachable';
  }

  try {
    const drive = await (await fetch('/drive-sync')).json();
    diagnostics.driveSync = {
      connected: drive?.connected,
      enabled: drive?.enabled,
      revision: drive?.revision,
      lastError: drive?.lastError,
    };
  } catch (err) {
    diagnostics.driveSync = 'unavailable';
  }

  return diagnostics;
};

export const BugReportModal: FC<{ route: string; onClose: () => void }> = ({
  route,
  onClose,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<BugScope>(suggestScope(route));
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    collectDiagnostics(fetch).then(setDiagnostics);
  }, [fetch]);

  const submit = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    setSaving(true);
    try {
      await fetch('/bug-reports', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          scope,
          route,
          platform: 'web',
          diagnostics: diagnostics ? JSON.stringify(diagnostics) : undefined,
        }),
      });

      toaster.show(
        scope === 'POSTPLS'
          ? t('bug_report_sent', 'Report saved — it will go out with the next batch')
          : t(
              'bug_report_sent_upstream',
              'Report saved. Upstream bugs are kept here, not filed automatically.'
            ),
        'success'
      );
      onClose();
    } catch (err) {
      toaster.show(t('bug_report_failed', 'Could not save the report'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [description, diagnostics, fetch, onClose, route, scope, t, title, toaster]);

  return (
    <div className="flex flex-col gap-[14px]">
      <Input
        label={t('bug_report_title', 'What went wrong?')}
        name="title"
        disableForm={true}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('bug_report_title_hint', 'Calendar is empty after syncing')}
        autoFocus
      />

      <Textarea
        label={t('bug_report_description', 'What were you doing?')}
        name="description"
        disableForm={true}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t(
          'bug_report_description_hint',
          'Steps you took, what you expected, what happened instead.'
        )}
      />

      <Select
        label={t('bug_report_scope', 'Where does this belong?')}
        name="scope"
        disableForm={true}
        value={scope}
        onChange={(e) => setScope(e.target.value as BugScope)}
      >
        <option value="POSTPLS">
          {t('bug_report_scope_postpls', `${BRAND_NAME} — something this fork added`)}
        </option>
        <option value="UPSTREAM">
          {t(
            'bug_report_scope_upstream',
            `${BRAND_UPSTREAM_NAME} — something inherited from upstream`
          )}
        </option>
      </Select>

      <div className="text-[12px] text-textItemBlur">
        {scope === 'POSTPLS'
          ? t(
              'bug_report_scope_postpls_hint',
              'Becomes a GitHub issue on your repository when the batch goes out.'
            )
          : t(
              'bug_report_scope_upstream_hint',
              'Kept here with a ready-to-paste body — upstream has its own tracker, which this host cannot file into.'
            )}
      </div>

      <div className="text-[12px] text-textItemBlur">
        {diagnostics
          ? t(
              'bug_report_diagnostics_ready',
              'Host status, sync state and device details are attached. No post content is included.'
            )
          : t('bug_report_diagnostics_loading', 'Collecting diagnostics…')}
      </div>

      <div className="flex gap-[10px] justify-end">
        <Button type="button" secondary onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          onClick={submit}
          loading={saving}
          disabled={!title.trim() || !description.trim()}
        >
          {t('bug_report_submit', 'Send report')}
        </Button>
      </div>
    </div>
  );
};
