'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { BRAND_DRIVE_FOLDER } from '@gitroom/helpers/branding/branding';

interface DriveSyncState {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  accountEmail: string | null;
  revision: number;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  lastError: string | null;
}

export const useDriveSync = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/drive-sync')).json() as Promise<DriveSyncState>;
  }, [fetch]);

  return useSWR<DriveSyncState>('drive-sync', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-[20px] text-[14px]">
    <span className="text-textItemBlur">{label}</span>
    <span className="text-newTextColor">{value}</span>
  </div>
);

export const DriveSync: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, mutate, isLoading } = useDriveSync();
  const [busy, setBusy] = useState(false);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const { url } = await (await fetch('/drive-sync/auth-url')).json();
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }, [fetch]);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      const result = await (
        await fetch('/drive-sync/sync', { method: 'POST' })
      ).json();

      toaster.show(
        result?.synced
          ? t('drive_synced', 'Synced with Google Drive')
          : t('drive_not_connected', 'Google Drive is not connected'),
        result?.synced ? 'success' : 'warning'
      );
      mutate();
    } catch (err) {
      toaster.show(t('drive_sync_failed', 'Could not sync with Google Drive'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [fetch, mutate, t, toaster]);

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      await fetch('/drive-sync/enabled', {
        method: 'PUT',
        body: JSON.stringify({ enabled: !data?.enabled }),
      });
      mutate();
    } finally {
      setBusy(false);
    }
  }, [data?.enabled, fetch, mutate]);

  const disconnect = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'drive_disconnect_confirm',
          'Disconnect Google Drive? Posts already in Drive are left alone.'
        ),
        t('disconnect', 'Disconnect')
      ))
    ) {
      return;
    }

    setBusy(true);
    try {
      await fetch('/drive-sync/disconnect', { method: 'POST' });
      mutate();
    } finally {
      setBusy(false);
    }
  }, [fetch, mutate, t]);

  if (isLoading) {
    return <div className="text-textItemBlur">{t('loading', 'Loading')}...</div>;
  }

  if (!data?.configured) {
    return (
      <div className="flex flex-col gap-[12px]">
        <h3 className="text-[20px]">{t('drive_sync', 'Google Drive Sync')}</h3>
        <div className="text-textItemBlur text-[14px]">
          {t(
            'drive_not_configured',
            'This host has no Google Drive credentials. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to enable cross-device sync.'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[4px]">
        <h3 className="text-[20px]">{t('drive_sync', 'Google Drive Sync')}</h3>
        <div className="text-textItemBlur text-[14px]">
          {t(
            'drive_sync_description',
            'Keeps your drafts and schedule in a folder in your own Google Drive, so the PostPls app on your phone keeps working while this host is switched off.'
          )}
        </div>
      </div>

      {!data.connected ? (
        <div>
          <Button onClick={connect} loading={busy}>
            {t('drive_connect', 'Connect Google Drive')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-[14px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
          <Row
            label={t('drive_account', 'Account')}
            value={data.accountEmail || '—'}
          />
          <Row label={t('drive_folder', 'Folder')} value={BRAND_DRIVE_FOLDER} />
          <Row
            label={t('drive_status', 'Status')}
            value={
              data.enabled
                ? t('enabled', 'Enabled')
                : t('paused', 'Paused')
            }
          />
          <Row
            label={t('drive_last_sync', 'Last sync')}
            value={
              data.lastPushedAt
                ? dayjs(data.lastPushedAt).format('MMM D, HH:mm')
                : t('never', 'Never')
            }
          />
          <Row
            label={t('drive_revision', 'Revision')}
            value={String(data.revision)}
          />

          {!!data.lastError && (
            <div className="text-[13px] text-red-400">{data.lastError}</div>
          )}

          <div className="flex gap-[10px] flex-wrap">
            <Button onClick={syncNow} loading={busy}>
              {t('drive_sync_now', 'Sync now')}
            </Button>
            <Button secondary onClick={toggle} loading={busy}>
              {data.enabled ? t('pause', 'Pause') : t('resume', 'Resume')}
            </Button>
            <Button secondary onClick={disconnect} loading={busy}>
              {t('disconnect', 'Disconnect')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
