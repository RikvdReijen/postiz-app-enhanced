import { BRAND_DEEP_LINK_SCHEME } from '@gitroom/helpers/branding/branding';

/**
 * Mirrors the QuickAccessTarget enum in the Prisma schema. Kept as a plain
 * union so the Android app can import it without pulling in @prisma/client.
 */
export type QuickAccessTarget =
  | 'CALENDAR'
  | 'NEW_POST'
  | 'ANALYTICS'
  | 'SETTINGS'
  | 'PROVIDER'
  | 'ACCOUNT';

export const QUICK_ACCESS_TARGETS: QuickAccessTarget[] = [
  'CALENDAR',
  'NEW_POST',
  'ANALYTICS',
  'SETTINGS',
  'PROVIDER',
  'ACCOUNT',
];

export interface QuickAccessDestination {
  target: QuickAccessTarget;
  integrationId?: string | null;
  providerIdentifier?: string | null;
}

/**
 * Where a scan lands inside the web app. PROVIDER and ACCOUNT both open the
 * composer, pre-filtered, which is the whole point of sticking a tag on a desk.
 */
export const quickAccessRoute = (destination: QuickAccessDestination): string => {
  switch (destination.target) {
    case 'NEW_POST':
      return '/launches?open=new';
    case 'ANALYTICS':
      return '/analytics';
    case 'SETTINGS':
      return '/settings';
    case 'PROVIDER':
      return `/launches?open=new&provider=${encodeURIComponent(
        destination.providerIdentifier || ''
      )}`;
    case 'ACCOUNT':
      return `/launches?open=new&integration=${encodeURIComponent(
        destination.integrationId || ''
      )}`;
    case 'CALENDAR':
    default:
      return '/launches';
  }
};

/**
 * What actually gets encoded into a QR code or written to an NFC tag.
 *
 * It is a normal https URL rather than a custom scheme on purpose: a phone
 * without PostPls installed still opens the web app, while a phone with the app
 * installed is handed the same URL through Android App Links. The short /q/
 * route also lets the host count scans and lets us re-point a printed tag later
 * without reprinting it.
 */
export const quickAccessScanUrl = (publicUrl: string, tagId: string): string =>
  `${publicUrl.replace(/\/$/, '')}/q/${tagId}`;

/**
 * The in-app equivalent, used when the Android app already has the tag resolved
 * and just needs to route, and by the notification quick actions.
 */
export const quickAccessDeepLink = (
  destination: QuickAccessDestination
): string => {
  const params = new URLSearchParams({ target: destination.target });
  if (destination.integrationId) {
    params.set('integration', destination.integrationId);
  }
  if (destination.providerIdentifier) {
    params.set('provider', destination.providerIdentifier);
  }

  return `${BRAND_DEEP_LINK_SCHEME}://open?${params.toString()}`;
};
