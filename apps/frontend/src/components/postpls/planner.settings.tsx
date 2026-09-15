'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Select } from '@gitroom/react/form/select';
import { Input } from '@gitroom/react/form/input';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface PlannerSettingsState {
  scanIntervalMinutes: number;
  lookbackHours: number;
  paused: boolean;
  lastScanAt: string | null;
  /** How often the sweep workflow itself wakes up; the interval floor. */
  tickMinutes: number;
}

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60, 120, 240, 720, 1440];

export const usePlannerSettings = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/planner/settings')).json() as Promise<PlannerSettingsState>;
  }, [fetch]);

  return useSWR<PlannerSettingsState>('planner-settings', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

export const PlannerSettings: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, mutate, isLoading } = usePlannerSettings();

  const [scanIntervalMinutes, setScanIntervalMinutes] = useState(60);
  const [lookbackHours, setLookbackHours] = useState(48);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setScanIntervalMinutes(data.scanIntervalMinutes);
    setLookbackHours(data.lookbackHours);
    setPaused(data.paused);
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/planner/settings', {
        method: 'POST',
        body: JSON.stringify({ scanIntervalMinutes, lookbackHours, paused }),
      });
      toaster.show(t('planner_saved', 'Planner settings saved'), 'success');
      mutate();
    } catch (err) {
      toaster.show(t('planner_save_failed', 'Could not save planner settings'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [fetch, lookbackHours, mutate, paused, scanIntervalMinutes, t, toaster]);

  if (isLoading) {
    return <div className="text-textItemBlur">{t('loading', 'Loading')}...</div>;
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[4px]">
        <h3 className="text-[20px]">{t('planner', 'Planner')}</h3>
        <div className="text-textItemBlur text-[14px]">
          {t(
            'planner_description',
            'The planner sweeps for posts that were due but never went out — after a restart, a network blip, or a host that was switched off. This controls how often it looks and how far back it reaches.'
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[14px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
        <Select
          label={t('planner_interval', 'Check for new posts every')}
          name="scanIntervalMinutes"
          disableForm={true}
          value={scanIntervalMinutes}
          onChange={(e) => setScanIntervalMinutes(Number(e.target.value))}
        >
          {INTERVAL_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes < 60
                ? `${minutes} ${t('minutes', 'minutes')}`
                : `${minutes / 60} ${
                    minutes === 60 ? t('hour', 'hour') : t('hours', 'hours')
                  }`}
            </option>
          ))}
        </Select>

        <Input
          label={t('planner_lookback', 'Reach back (hours)')}
          name="lookbackHours"
          type="number"
          min={1}
          max={168}
          disableForm={true}
          value={lookbackHours}
          onChange={(e) => setLookbackHours(Number(e.target.value))}
        />

        <Checkbox
          label={t('planner_paused', 'Pause the planner for this workspace')}
          name="paused"
          disableForm={true}
          checked={paused}
          onChange={(e) => setPaused(e.target.value)}
        />

        <div className="text-[13px] text-textItemBlur">
          {t('planner_last_scan', 'Last sweep')}:{' '}
          {data?.lastScanAt
            ? dayjs(data.lastScanAt).format('MMM D, HH:mm')
            : t('never', 'Never')}
          {' · '}
          {t(
            'planner_tick_note',
            'the host wakes every {{tick}} minutes, so this is the floor'
          ).replace('{{tick}}', String(data?.tickMinutes ?? 5))}
        </div>

        <div>
          <Button onClick={save} loading={saving}>
            {t('save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
