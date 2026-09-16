'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import QRCode from 'qrcode';
import { BrandLogoId, getBrandLogo, BRAND_COLORS } from '@gitroom/helpers/branding/branding';

/**
 * Builds a self-contained branded QR code.
 *
 * The brand mark is inlined rather than referenced, so the SVG a user downloads
 * or sends to a printer carries the logo with it. Error correction is forced to
 * H because the mark covers the middle of the code.
 */
const buildBrandedQr = async (
  url: string,
  markSvg: string,
  accentColor: string
) => {
  const qr = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark: accentColor, light: '#ffffff' },
  });

  const viewBox = qr.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) {
    return qr;
  }

  const size = Number(viewBox[1]);
  const badge = size * 0.24;
  const offset = (size - badge) / 2;
  const mark = markSvg
    .replace(/<\?xml[\s\S]*?\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '');

  // The marks are all authored on a 64x64 canvas, so one scale factor works.
  const overlay =
    `<g transform="translate(${offset} ${offset}) scale(${badge / 64})">` +
    `<rect x="-4" y="-4" width="72" height="72" rx="20" fill="#ffffff"/>` +
    `${mark}</g>`;

  return qr.replace('</svg>', `${overlay}</svg>`);
};

/**
 * The marks are static files under /public rather than API responses, so this
 * deliberately does not go through `useFetch` — but it is still SWR, so the
 * four of them are fetched once and shared by every code on the screen.
 */
const useBrandMarkSvg = (logo?: BrandLogoId | string | null) => {
  const path = getBrandLogo(logo).mark;
  const load = useCallback(async (key: string) => {
    return (await fetch(key)).text();
  }, []);

  return useSWR(path, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

export const useBrandedQr = (
  url: string,
  logo?: BrandLogoId | string | null,
  accentColor?: string | null
) => {
  const { data: markSvg } = useBrandMarkSvg(logo);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    if (!markSvg || !url) {
      setSvg('');
      return;
    }

    let cancelled = false;
    buildBrandedQr(url, markSvg, accentColor || BRAND_COLORS.ink)
      .then((built) => {
        if (!cancelled) {
          setSvg(built);
        }
      })
      .catch(() => setSvg(''));

    return () => {
      cancelled = true;
    };
  }, [url, markSvg, accentColor]);

  return svg;
};

export const QrPreview: FC<{ svg: string; size?: number }> = ({
  svg,
  size = 180,
}) => {
  if (!svg) {
    return (
      <div
        className="bg-newBgLineColor rounded-[8px] animate-pulse shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="bg-white rounded-[8px] p-[6px] shrink-0"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export const useQrActions = (name: string, svg: string) => {
  const download = useCallback(() => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-qr.svg`;
    link.click();
    URL.revokeObjectURL(href);
  }, [name, svg]);

  const print = useCallback(() => {
    const frame = window.open('', '_blank', 'width=600,height=700');
    if (!frame) {
      return;
    }

    frame.document.write(
      `<html><head><title>${name}</title></head>` +
        `<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Helvetica,Arial,sans-serif">` +
        `<div style="width:320px">${svg}</div>` +
        `<div style="margin-top:12px;font-size:16px">${name}</div>` +
        `</body></html>`
    );
    frame.document.close();
    frame.focus();
    frame.print();
  }, [name, svg]);

  return { download, print };
};
