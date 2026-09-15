'use client';

import { FC, useCallback } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export interface HostHealth {
  brand: string;
  version: string | null;
  checkedAt: string;
  healthy: boolean;
  services: {
    api: 'up' | 'down';
    database: 'up' | 'down';
    orchestrator: 'up' | 'down';
  };
}

/**
 * A failed request is the interesting case, not an error: a self-hosted host
 * usually lives on a desktop that gets switched off, so SWR's error state *is*
 * the "offline" state.
 */
export const useHostHealth = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/host/health')).json() as Promise<HostHealth>;
  }, [fetch]);

  return useSWR<HostHealth>('host-health', load, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });
};

export const HostStatus: FC<{ withLabel?: boolean; className?: string }> = ({
  withLabel = true,
  className,
}) => {
  const t = useT();
  const { data, error, isLoading } = useHostHealth();

  const state = isLoading
    ? 'checking'
    : error || !data
    ? 'offline'
    : data.healthy
    ? 'online'
    : 'degraded';

  const label = {
    checking: t('host_checking', 'Checking host…'),
    offline: t('host_offline', 'Host offline'),
    degraded: t('host_degraded', 'Host degraded'),
    online: t('host_online', 'Host online'),
  }[state];

  const detail =
    state === 'degraded' && data
      ? Object.entries(data.services)
          .filter(([, value]) => value === 'down')
          .map(([key]) => key)
          .join(', ')
      : '';

  return (
    <div
      className={clsx(
        'flex items-center gap-[8px] text-[12px] text-textItemBlur',
        className
      )}
      title={
        detail ? `${t('host_not_responding', 'Not responding')}: ${detail}` : label
      }
    >
      <span
        className={clsx(
          'w-[8px] h-[8px] rounded-full shrink-0',
          state === 'online' && 'bg-[#3c7c5a]',
          state === 'degraded' && 'bg-[#fcba03]',
          state === 'offline' && 'bg-[#d82d7e]',
          state === 'checking' && 'bg-newTableText animate-pulse'
        )}
      />
      {!!withLabel && <span>{label}</span>}
    </div>
  );
};
