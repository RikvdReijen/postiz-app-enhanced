'use client';

import { DEFAULT_BRAND_LOGO, getBrandLogo, BRAND_NAME } from '@gitroom/helpers/branding/branding';

export const Logo = () => {
  const logo = getBrandLogo(DEFAULT_BRAND_LOGO);

  return (
    <img
      src={logo.mark}
      alt={BRAND_NAME}
      width={48}
      height={48}
      className="mt-[8px] mx-auto min-w-[48px] min-h-[48px]"
    />
  );
};
