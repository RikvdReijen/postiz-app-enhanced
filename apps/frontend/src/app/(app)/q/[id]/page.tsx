import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${BRAND_NAME} Quick Access`,
  description: '',
  robots: { index: false, follow: false },
};

/**
 * Landing point for a scanned QR code or a tapped NFC tag.
 *
 * Resolved on the server so the redirect happens before anything renders: the
 * scan is counted, and a phone without the app installed still lands on the
 * right screen in the browser.
 */
export default async function QuickAccessScan(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const response = await internalFetch(`/q/${id}`);
  if (!response.ok) {
    redirect('/launches');
  }

  const { route } = await response.json();
  redirect(route || '/launches');
}
