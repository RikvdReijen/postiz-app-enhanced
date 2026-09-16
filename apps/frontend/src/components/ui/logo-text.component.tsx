import React from 'react';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  DEFAULT_BRAND_LOGO,
  getBrandLogo,
} from '@gitroom/helpers/branding/branding';

/**
 * The horizontal lockup. The wordmark is DOM text using `currentColor`, so it
 * keeps working on both the light auth screens and the dark app chrome.
 */
export const LogoTextComponent = () => {
  const logo = getBrandLogo(DEFAULT_BRAND_LOGO);

  return (
    <div className="flex items-center gap-[10px]">
      <img
        src={logo.mark}
        alt={BRAND_NAME}
        width={36}
        height={36}
        className="min-w-[36px] min-h-[36px]"
      />
      <div className="flex flex-col">
        <div className="text-[22px] font-[600] leading-[1.1] text-current">
          {BRAND_NAME}
        </div>
        <div className="text-[10px] opacity-70 text-current">{BRAND_TAGLINE}</div>
      </div>
    </div>
  );
};
