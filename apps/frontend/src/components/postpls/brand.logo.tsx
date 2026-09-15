'use client';

import { FC } from 'react';
import clsx from 'clsx';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BrandLogoId,
  getBrandLogo,
} from '@gitroom/helpers/branding/branding';

/**
 * The wordmark is rendered as DOM text rather than baked into the SVG so it
 * picks up the current theme — the standalone lockup files in /postpls are for
 * print and for the README, where the background is known.
 */
export const BrandLogo: FC<{
  logo?: BrandLogoId;
  size?: number;
  withWordmark?: boolean;
  withTagline?: boolean;
  className?: string;
}> = ({ logo, size = 32, withWordmark, withTagline, className }) => {
  const brandLogo = getBrandLogo(logo);

  return (
    <div className={clsx('flex items-center gap-[10px]', className)}>
      <img
        src={brandLogo.mark}
        alt={BRAND_NAME}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
      {!!withWordmark && (
        <div className="flex flex-col">
          <div className="text-newTextColor font-[600] leading-[1.1] text-[18px]">
            {BRAND_NAME}
          </div>
          {!!withTagline && (
            <div className="text-textItemBlur text-[11px]">{BRAND_TAGLINE}</div>
          )}
        </div>
      )}
    </div>
  );
};
