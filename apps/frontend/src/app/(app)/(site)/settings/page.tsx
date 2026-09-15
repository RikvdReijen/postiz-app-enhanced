import { SettingsPopup } from '@gitroom/frontend/components/layout/settings.component';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? BRAND_NAME : 'Gitroom'} Settings`,
  description: '',
};
export default async function Index(props: {
  searchParams: Promise<{
    code: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  return <SettingsPopup />;
}
