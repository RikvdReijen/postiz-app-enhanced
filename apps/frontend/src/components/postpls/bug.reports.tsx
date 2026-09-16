'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { BugReport } from '@prisma/client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import {
  BRAND_NAME,
  BRAND_UPSTREAM_NAME,
  BRAND_UPSTREAM_REPOSITORY,
} from '@gitroom/helpers/branding/branding';
import { useBugReportSettings } from '@gitroom/frontend/components/postpls/use.bug.report.settings';

const BATCH_WINDOWS = [15, 60, 180, 360, 720, 1440, 4320];

const useBugReports = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/bug-reports')).json() as Promise<BugReport[]>;
  }, [fetch]);

  return useSWR<BugReport[]>('bug-reports', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    fallbackData: [],
  });
};

const formatWindow = (minutes: number) =>
  minutes < 60
    ? `${minutes} minutes`
    : minutes < 1440
    ? `${minutes / 60} hours`
    : `${minutes / 1440} days`;

export const BugReports: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data: settings, mutate, isLoading } = useBugReportSettings();
  const { data: reports, mutate: mutateReports } = useBugReports();

  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeThreshold, setShakeThreshold] = useState(18);
  const [batchWindowMinutes, setBatchWindowMinutes] = useState(360);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubRepository, setGithubRepository] = useState('');
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setShakeEnabled(settings.shakeEnabled);
    setShakeThreshold(settings.shakeThreshold);
    setBatchWindowMinutes(settings.batchWindowMinutes);
    setGithubEnabled(settings.githubEnabled);
    setGithubRepository(settings.githubRepository || '');
    setAutoFixEnabled(settings.autoFixEnabled);
  }, [settings]);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await fetch('/bug-reports/settings', {
        method: 'POST',
        body: JSON.stringify({
          shakeEnabled,
          shakeThreshold,
          batchWindowMinutes,
          githubEnabled,
          githubRepository: githubRepository.trim() || undefined,
          autoFixEnabled,
        }),
      });
      toaster.show(t('bug_settings_saved', 'Bug reporting settings saved'), 'success');
      mutate();
    } catch (err) {
      toaster.show(t('bug_settings_failed', 'Could not save the settings'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [
    autoFixEnabled,
    batchWindowMinutes,
    fetch,
    githubEnabled,
    githubRepository,
    mutate,
    shakeEnabled,
    shakeThreshold,
    t,
    toaster,
  ]);

  const dispatchNow = useCallback(async () => {
    setBusy(true);
    try {
      const result = await (
        await fetch('/bug-reports/dispatch', { method: 'POST' })
      ).json();

      toaster.show(
        t('bug_batch_sent', 'Batch sent')
          .concat(` — ${result?.filed ?? 0} filed, ${result?.skipped ?? 0} kept back`),
        'success'
      );
      mutate();
      mutateReports();
    } catch (err) {
      toaster.show(t('bug_batch_failed', 'Could not send the batch'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [fetch, mutate, mutateReports, t, toaster]);

  const remove = useCallback(
    (id: string) => async () => {
      if (
        !(await deleteDialog(
          t('bug_report_delete_confirm', 'Delete this report?'),
          t('delete', 'Delete')
        ))
      ) {
        return;
      }

      await fetch(`/bug-reports/${id}`, { method: 'DELETE' });
      mutateReports();
      mutate();
    },
    [fetch, mutate, mutateReports, t]
  );

  if (isLoading) {
    return <div className="text-textItemBlur">{t('loading', 'Loading')}...</div>;
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('bug_reports', 'Bug Reports')}</h3>
      <div className="text-textItemBlur mt-[4px] text-[14px]">
        {t(
          'bug_reports_description',
          'Shake the phone to report whatever just went wrong. Reports pile up and go out as one batch, so a bad afternoon costs one fix run instead of ten.'
        )}
      </div>

      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[14px]">
        <Checkbox
          label={t('bug_shake_enabled', 'Shake to report a bug')}
          name="shakeEnabled"
          disableForm={true}
          checked={shakeEnabled}
          onChange={(e) => setShakeEnabled(e.target.value)}
        />

        <Input
          label={t('bug_shake_threshold', 'Shake sensitivity (lower is more sensitive)')}
          name="shakeThreshold"
          type="number"
          min={8}
          max={40}
          disableForm={true}
          value={shakeThreshold}
          onChange={(e) => setShakeThreshold(Number(e.target.value))}
        />

        <Select
          label={t('bug_batch_window', 'Let reports stack up for')}
          name="batchWindowMinutes"
          disableForm={true}
          value={batchWindowMinutes}
          onChange={(e) => setBatchWindowMinutes(Number(e.target.value))}
        >
          {BATCH_WINDOWS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {formatWindow(minutes)}
            </option>
          ))}
        </Select>

        <Checkbox
          label={t('bug_github_enabled', `File ${BRAND_NAME} bugs as GitHub issues`)}
          name="githubEnabled"
          disableForm={true}
          checked={githubEnabled}
          onChange={(e) => setGithubEnabled(e.target.value)}
        />

        {!settings?.githubConfigured && (
          <div className="text-[13px] text-red-400">
            {t(
              'bug_github_unconfigured',
              'This host has no GitHub token. Set POSTPLS_GITHUB_TOKEN to file issues.'
            )}
          </div>
        )}

        {githubEnabled && (
          <>
            <Input
              label={t('bug_github_repository', 'Repository (owner/repo)')}
              name="githubRepository"
              disableForm={true}
              value={githubRepository}
              onChange={(e) => setGithubRepository(e.target.value)}
              placeholder="you/postiz-app-enhanced"
            />

            <Checkbox
              label={t('bug_autofix_enabled', 'Start a Claude Code run for each batch')}
              name="autoFixEnabled"
              disableForm={true}
              checked={autoFixEnabled}
              onChange={(e) => setAutoFixEnabled(e.target.value)}
            />
            <div className="text-[12px] text-textItemBlur">
              {t(
                'bug_autofix_hint',
                'Fires a repository_dispatch after the issues are filed. The workflow in your repository is what spends tokens, not this host.'
              )}
            </div>
          </>
        )}

        <div className="text-[13px] text-textItemBlur">
          {t('bug_pending', 'Waiting to go out')}: {settings?.pending ?? 0}
          {!!settings?.nextBatchAt &&
            ` · ${t('bug_next_batch', 'next batch')} ${dayjs(
              settings.nextBatchAt
            ).format('MMM D, HH:mm')}`}
        </div>

        <div className="flex gap-[10px] flex-wrap">
          <Button onClick={save} loading={busy}>
            {t('save', 'Save')}
          </Button>
          <Button
            secondary
            onClick={dispatchNow}
            loading={busy}
            disabled={!settings?.pending}
          >
            {t('bug_send_now', 'Send batch now')}
          </Button>
        </div>
      </div>

      {!reports?.length ? (
        <div className="text-textItemBlur text-[14px]">
          {t('bug_reports_empty', 'No reports yet.')}
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-sixth border-fifth border rounded-[4px] p-[16px] flex flex-col gap-[6px]"
            >
              <div className="flex justify-between gap-[12px]">
                <span className="text-newTextColor">{report.title}</span>
                <span className="text-[12px] text-textItemBlur shrink-0">
                  {dayjs(report.createdAt).format('MMM D, HH:mm')}
                </span>
              </div>
              <div className="text-[13px] text-textItemBlur">
                {report.scope === 'POSTPLS' ? BRAND_NAME : BRAND_UPSTREAM_NAME}
                {' · '}
                {report.status}
                {!!report.platform && ` · ${report.platform}`}
              </div>
              {!!report.lastError && (
                <div className="text-[12px] text-red-400">{report.lastError}</div>
              )}
              <div className="flex gap-[10px] items-center flex-wrap">
                {!!report.githubIssueUrl && (
                  <a
                    href={report.githubIssueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] underline text-newTextColor"
                  >
                    {t('bug_view_issue', 'View issue')}
                  </a>
                )}
                {report.scope === 'UPSTREAM' && (
                  <a
                    href={`${BRAND_UPSTREAM_REPOSITORY}/issues/new`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] underline text-newTextColor"
                  >
                    {t('bug_report_upstream', 'Report upstream')}
                  </a>
                )}
                <button
                  type="button"
                  onClick={remove(report.id)}
                  className="text-[13px] underline text-textItemBlur"
                >
                  {t('delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
