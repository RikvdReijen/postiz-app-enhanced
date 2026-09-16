import { Metadata } from 'next';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';
import { DriveSyncCallback } from '@gitroom/frontend/components/postpls/drive.sync.callback';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${BRAND_NAME} Google Drive`,
  description: '',
};

/**
 * Where Google sends the user back after they authorize Drive access. The code
 * is handed to the backend from the browser so the refresh token never travels
 * through the frontend's own server.
 */
export default async function DriveSyncCallbackPage(props: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await props.searchParams;

  return <DriveSyncCallback code={code} error={error} />;
}
