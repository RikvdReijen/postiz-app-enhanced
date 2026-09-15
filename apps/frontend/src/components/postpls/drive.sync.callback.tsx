'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { BrandLogo } from '@gitroom/frontend/components/postpls/brand.logo';

export const DriveSyncCallback: FC<{ code?: string; error?: string }> = ({
  code,
  error,
}) => {
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();
  const [failure, setFailure] = useState(error || '');
  // React runs effects twice in development; exchanging the same code twice
  // fails on Google's side and would show a spurious error.
  const exchanged = useRef(false);

  useEffect(() => {
    if (error || !code || exchanged.current) {
      return;
    }

    exchanged.current = true;
    fetch('/drive-sync/connect', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('connect failed');
        }
        router.replace('/settings');
      })
      .catch(() =>
        setFailure(t('drive_connect_failed', 'Could not connect Google Drive'))
      );
  }, [code, error, fetch, router, t]);

  return (
    <div className="flex flex-col items-center justify-center gap-[16px] py-[80px]">
      <BrandLogo size={48} withWordmark withTagline />
      <div className="text-textItemBlur text-[14px]">
        {failure || t('drive_connecting', 'Connecting Google Drive…')}
      </div>
    </div>
  );
};
