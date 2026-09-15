'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';
import {
  QrPreview,
  useBrandedQr,
} from '@gitroom/frontend/components/postpls/quick.access.qr';

interface Pairing {
  apiUrl: string;
  organizationId: string;
  token: string;
  deepLink: string;
}

const useMobilePairing = (enabled: boolean) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/mobile/pairing')).json() as Promise<Pairing>;
  }, [fetch]);

  return useSWR<Pairing>(enabled ? 'mobile-pairing' : null, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};

export const MobilePairing: FC = () => {
  const t = useT();
  const toaster = useToaster();
  // The code carries a working credential, so it is never on screen until
  // somebody deliberately asks for it.
  const [revealed, setRevealed] = useState(false);
  const { data, isLoading } = useMobilePairing(revealed);
  const svg = useBrandedQr(data?.deepLink || '', null, '#0e0e0e');

  const copy = useCallback(async () => {
    if (!data) {
      return;
    }

    await navigator.clipboard.writeText(data.deepLink);
    toaster.show(t('copied', 'Copied'), 'success');
  }, [data, t, toaster]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[4px]">
        <h2 className="text-[20px]">{t('mobile_app', 'Mobile App')}</h2>
        <div className="text-textItemBlur text-[14px]">
          {t(
            'mobile_app_description',
            'Pair the {{brand}} Android app with this host. The app keeps drafting from your Google Drive while this machine is switched off.'
          ).replace('{{brand}}', BRAND_NAME)}
        </div>
      </div>

      <div className="flex flex-col gap-[14px] bg-newBgLineColor rounded-[8px] p-[16px]">
        <div className="text-[13px] text-ai">
          {t(
            'mobile_pairing_warning',
            'The pairing code signs your phone in as you. Treat it like a password and only scan it with your own device.'
          )}
        </div>

        {!revealed ? (
          <div>
            <Button onClick={() => setRevealed(true)}>
              {t('mobile_show_pairing', 'Show pairing code')}
            </Button>
          </div>
        ) : isLoading || !data ? (
          <div className="text-textItemBlur">{t('loading', 'Loading')}...</div>
        ) : (
          <div className="flex gap-[16px] flex-wrap">
            <QrPreview svg={svg} size={180} />
            <div className="flex flex-col gap-[8px] text-[13px] min-w-0">
              <div>
                <span className="text-textItemBlur">
                  {t('mobile_host', 'Host')}:{' '}
                </span>
                <span className="text-newTextColor break-all">{data.apiUrl}</span>
              </div>
              <div>
                <span className="text-textItemBlur">
                  {t('mobile_workspace', 'Workspace')}:{' '}
                </span>
                <span className="text-newTextColor break-all">
                  {data.organizationId}
                </span>
              </div>
              <div className="flex gap-[8px] mt-auto">
                <Button secondary onClick={copy}>
                  {t('copy_link', 'Copy link')}
                </Button>
                <Button secondary onClick={() => setRevealed(false)}>
                  {t('hide', 'Hide')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
