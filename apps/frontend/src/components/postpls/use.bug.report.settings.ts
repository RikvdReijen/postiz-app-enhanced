'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export interface BugReportSettingsState {
  shakeEnabled: boolean;
  shakeThreshold: number;
  batchWindowMinutes: number;
  githubEnabled: boolean;
  githubRepository: string | null;
  autoFixEnabled: boolean;
  githubConfigured: boolean;
  pending: number;
  nextBatchAt: string | null;
}

export const useBugReportSettings = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(
      '/bug-reports/settings'
    )).json() as Promise<BugReportSettingsState>;
  }, [fetch]);

  return useSWR<BugReportSettingsState>('bug-report-settings', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};
