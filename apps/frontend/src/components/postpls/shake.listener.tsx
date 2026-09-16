'use client';

import { FC, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useShake } from '@gitroom/frontend/components/postpls/use.shake';
import { BugReportModal } from '@gitroom/frontend/components/postpls/bug.report.modal';
import { useBugReportSettings } from '@gitroom/frontend/components/postpls/use.bug.report.settings';

/**
 * Renders nothing; it exists so shake-to-report works on every screen without
 * each screen having to know about it.
 */
export const ShakeListener: FC = () => {
  const t = useT();
  const modal = useModals();
  const pathname = usePathname();
  const { data: settings } = useBugReportSettings();

  const openReport = useCallback(() => {
    modal.openModal({
      title: t('bug_report', 'Report a bug'),
      children: (close: () => void) => (
        <BugReportModal route={pathname || '/'} onClose={close} />
      ),
    });
  }, [modal, pathname, t]);

  useShake(!!settings?.shakeEnabled, settings?.shakeThreshold, openReport);

  return null;
};
