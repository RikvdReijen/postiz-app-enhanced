/**
 * PostPls branding.
 *
 * PostPls is an opinionated fork of Postiz. Everything user facing lives here so
 * the fork keeps a single source of truth and upstream merges stay boring: when
 * Postiz renames something we only have to reconcile this file.
 */

export const BRAND_NAME = 'PostPls';
export const BRAND_EMOJI = '✉️🙏';
export const BRAND_TAGLINE = 'Opinionated version of Postiz';
export const BRAND_UPSTREAM_NAME = 'Postiz';
export const BRAND_UPSTREAM_REPOSITORY = 'https://github.com/gitroomhq/postiz-app';

/**
 * Custom scheme used by QR codes, NFC tags and the Android app so a scan can
 * jump straight into a screen instead of landing on the dashboard.
 */
export const BRAND_DEEP_LINK_SCHEME = 'postpls';
export const BRAND_ANDROID_APPLICATION_ID = 'app.postpls.mobile';

/**
 * The folder PostPls owns inside the user's Google Drive. Both the host and the
 * Android app read and write the same bundle from here, which is what lets the
 * phone keep working while the host is powered off.
 */
export const BRAND_DRIVE_FOLDER = 'PostPls';

export const BRAND_COLORS = {
  primary: '#612bd3',
  accent: '#d82d7e',
  ink: '#0e0e0e',
  paper: '#ffffff',
};

export type BrandLogoId = 'envelope-pray' | 'monogram-send' | 'paper-plane' | 'scheduled-stamp';

export interface BrandLogo {
  id: BrandLogoId;
  name: string;
  description: string;
  /** Square mark, safe down to a 24px favicon or an NFC sticker. */
  mark: string;
  /** Horizontal mark + wordmark lockup. */
  lockup: string;
}

/**
 * Where the logo files live, relative to the app's public root. Kept as data so
 * the quick-access screen can offer all four when branding a QR code.
 */
export const BRAND_LOGOS: BrandLogo[] = [
  {
    id: 'envelope-pray',
    name: 'Envelope & Pray',
    description:
      'The literal ✉️🙏 — an envelope whose flap folds into two praying hands. The default mark.',
    mark: '/postpls/envelope-pray.svg',
    lockup: '/postpls/envelope-pray-lockup.svg',
  },
  {
    id: 'monogram-send',
    name: 'Monogram Send',
    description:
      'A rounded "PP" monogram cut by a send arrow. Reads best at small sizes and on dark backgrounds.',
    mark: '/postpls/monogram-send.svg',
    lockup: '/postpls/monogram-send-lockup.svg',
  },
  {
    id: 'paper-plane',
    name: 'Paper Plane',
    description:
      'A paper plane folded out of an envelope, for when the mark sits next to other product icons.',
    mark: '/postpls/paper-plane.svg',
    lockup: '/postpls/paper-plane-lockup.svg',
  },
  {
    id: 'scheduled-stamp',
    name: 'Scheduled Stamp',
    description:
      'An envelope postmarked with a clock ring — the scheduling half of the product, for print and stickers.',
    mark: '/postpls/scheduled-stamp.svg',
    lockup: '/postpls/scheduled-stamp-lockup.svg',
  },
];

export const DEFAULT_BRAND_LOGO: BrandLogoId = 'envelope-pray';

export const getBrandLogo = (id?: BrandLogoId | string | null): BrandLogo => {
  return (
    BRAND_LOGOS.find((logo) => logo.id === id) ||
    BRAND_LOGOS.find((logo) => logo.id === DEFAULT_BRAND_LOGO)!
  );
};
