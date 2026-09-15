'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import {
  BRAND_LOGOS,
  BrandLogoId,
  DEFAULT_BRAND_LOGO,
} from '@gitroom/helpers/branding/branding';
import {
  QUICK_ACCESS_TARGETS,
  QuickAccessTarget,
} from '@gitroom/helpers/branding/quick.access.link';
import {
  QrPreview,
  useBrandedQr,
  useQrActions,
} from '@gitroom/frontend/components/postpls/quick.access.qr';
import { useNfcWriter } from '@gitroom/frontend/components/postpls/use.nfc.writer';

interface QuickAccessTag {
  id: string;
  name: string;
  target: QuickAccessTarget;
  integrationId: string | null;
  providerIdentifier: string | null;
  logo: string | null;
  accentColor: string | null;
  scans: number;
  url: string;
  integration?: {
    id: string;
    name: string;
    picture: string;
    providerIdentifier: string;
  } | null;
}

interface Integration {
  id: string;
  name: string;
  picture: string;
  identifier: string;
}

/**
 * Literal keys and literal fallbacks, so the translation extractor can see
 * them — a key built from a template literal is invisible to it.
 */
const useTargetLabels = (): Record<QuickAccessTarget, string> => {
  const t = useT();

  return {
    CALENDAR: t('quick_access_target_calendar', 'Open the calendar'),
    NEW_POST: t('quick_access_target_new_post', 'Start a new post'),
    ANALYTICS: t('quick_access_target_analytics', 'Open analytics'),
    SETTINGS: t('quick_access_target_settings', 'Open settings'),
    PROVIDER: t('quick_access_target_provider', 'New post on a platform'),
    ACCOUNT: t('quick_access_target_account', 'New post on one account'),
  };
};

const useQuickAccessTags = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/quick-access')).json() as Promise<QuickAccessTag[]>;
  }, [fetch]);

  return useSWR<QuickAccessTag[]>('quick-access', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    fallbackData: [],
  });
};

const useIntegrations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await (await fetch('/integrations/list')).json()).integrations;
  }, [fetch]);

  return useSWR<Integration[]>('quick-access-integrations', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    fallbackData: [],
  });
};

const TagForm: FC<{
  tag?: QuickAccessTag;
  integrations: Integration[];
  onSaved: () => void;
  onClose: () => void;
}> = ({ tag, integrations, onSaved, onClose }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const targetLabels = useTargetLabels();

  const [name, setName] = useState(tag?.name || '');
  const [target, setTarget] = useState<QuickAccessTarget>(
    tag?.target || 'CALENDAR'
  );
  const [integrationId, setIntegrationId] = useState(tag?.integrationId || '');
  const [providerIdentifier, setProviderIdentifier] = useState(
    tag?.providerIdentifier || ''
  );
  const [logo, setLogo] = useState<BrandLogoId>(
    (tag?.logo as BrandLogoId) || DEFAULT_BRAND_LOGO
  );
  const [accentColor, setAccentColor] = useState(tag?.accentColor || '#0e0e0e');
  const [saving, setSaving] = useState(false);

  const providers = useMemo(
    () => [...new Set(integrations.map((i) => i.identifier))],
    [integrations]
  );

  const save = useCallback(async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await fetch('/quick-access', {
        method: 'POST',
        body: JSON.stringify({
          ...(tag?.id ? { id: tag.id } : {}),
          name: name.trim(),
          target,
          integrationId: target === 'ACCOUNT' ? integrationId : undefined,
          providerIdentifier:
            target === 'PROVIDER' ? providerIdentifier : undefined,
          logo,
          accentColor,
        }),
      });

      toaster.show(t('quick_access_saved', 'Quick access tag saved'), 'success');
      onSaved();
      onClose();
    } catch (err) {
      toaster.show(t('quick_access_save_failed', 'Could not save the tag'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [
    accentColor,
    fetch,
    integrationId,
    logo,
    name,
    onClose,
    onSaved,
    providerIdentifier,
    t,
    tag?.id,
    target,
    toaster,
  ]);

  return (
    <div className="flex flex-col gap-[14px]">
      <Input
        label={t('name', 'Name')}
        name="name"
        disableForm={true}
        value={name}
        placeholder={t('quick_access_name_hint', 'Desk sticker, studio door, …')}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      <Select
        label={t('quick_access_target', 'Where it goes')}
        name="target"
        disableForm={true}
        value={target}
        onChange={(e) => setTarget(e.target.value as QuickAccessTarget)}
      >
        {QUICK_ACCESS_TARGETS.map((key) => (
          <option key={key} value={key}>
            {targetLabels[key]}
          </option>
        ))}
      </Select>

      {target === 'ACCOUNT' && (
        <Select
          label={t('quick_access_account', 'Account')}
          name="integrationId"
          disableForm={true}
          value={integrationId}
          onChange={(e) => setIntegrationId(e.target.value)}
        >
          <option value="">{t('select', 'Select')}…</option>
          {integrations.map((integration) => (
            <option key={integration.id} value={integration.id}>
              {integration.name}
            </option>
          ))}
        </Select>
      )}

      {target === 'PROVIDER' && (
        <Select
          label={t('quick_access_platform', 'Platform')}
          name="providerIdentifier"
          disableForm={true}
          value={providerIdentifier}
          onChange={(e) => setProviderIdentifier(e.target.value)}
        >
          <option value="">{t('select', 'Select')}…</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </Select>
      )}

      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">{t('quick_access_logo', 'Mark')}</div>
        <div className="flex gap-[10px] flex-wrap">
          {BRAND_LOGOS.map((brandLogo) => (
            <button
              key={brandLogo.id}
              type="button"
              title={brandLogo.description}
              onClick={() => setLogo(brandLogo.id)}
              className={clsx(
                'p-[6px] rounded-[8px] border transition-colors',
                logo === brandLogo.id
                  ? 'border-btnPrimary bg-boxHover'
                  : 'border-newTableBorder'
              )}
            >
              <img src={brandLogo.mark} alt={brandLogo.name} width={36} height={36} />
            </button>
          ))}
        </div>
      </div>

      <Input
        label={t('quick_access_accent', 'Code colour')}
        name="accentColor"
        type="color"
        disableForm={true}
        value={accentColor}
        onChange={(e) => setAccentColor(e.target.value)}
      />

      <div className="flex gap-[10px] justify-end">
        <Button type="button" secondary onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="button" onClick={save} loading={saving} disabled={!name.trim()}>
          {t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};

const TagCard: FC<{ tag: QuickAccessTag; onChanged: () => void }> = ({
  tag,
  onChanged,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const targetLabels = useTargetLabels();
  const svg = useBrandedQr(tag.url, tag.logo, tag.accentColor);
  const { download, print } = useQrActions(tag.name, svg);
  const nfc = useNfcWriter();

  const writeNfc = useCallback(async () => {
    try {
      await nfc.write(tag.url);
      toaster.show(t('nfc_written', 'Tag written — hold the phone still'), 'success');
    } catch (err) {
      toaster.show(
        t('nfc_failed', 'Could not write the NFC tag'),
        'warning'
      );
    }
  }, [nfc, t, tag.url, toaster]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(tag.url);
    toaster.show(t('copied', 'Copied'), 'success');
  }, [t, tag.url, toaster]);

  const remove = useCallback(async () => {
    if (
      !(await deleteDialog(
        t('quick_access_delete_confirm', 'Delete this tag? Printed codes stop working.'),
        t('delete', 'Delete')
      ))
    ) {
      return;
    }

    await fetch(`/quick-access/${tag.id}`, { method: 'DELETE' });
    onChanged();
  }, [fetch, onChanged, t, tag.id]);

  return (
    <div className="flex gap-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px]">
      <QrPreview svg={svg} size={160} />
      <div className="flex flex-col gap-[8px] flex-1 min-w-0">
        <div className="text-newTextColor text-[16px] font-[600]">{tag.name}</div>
        <div className="text-textItemBlur text-[13px]">
          {targetLabels[tag.target]}
          {!!tag.integration && ` · ${tag.integration.name}`}
          {!tag.integration && !!tag.providerIdentifier && ` · ${tag.providerIdentifier}`}
        </div>
        <div className="text-textItemBlur text-[12px] truncate">{tag.url}</div>
        <div className="text-textItemBlur text-[12px]">
          {tag.scans} {t('scans', 'scans')}
        </div>

        <div className="flex gap-[8px] flex-wrap mt-auto">
          <Button secondary onClick={download} disabled={!svg}>
            {t('download_svg', 'Download SVG')}
          </Button>
          <Button secondary onClick={print} disabled={!svg}>
            {t('print', 'Print')}
          </Button>
          <Button secondary onClick={copy}>
            {t('copy_link', 'Copy link')}
          </Button>
          {nfc.supported && (
            <Button secondary onClick={writeNfc} loading={nfc.writing}>
              {t('write_nfc', 'Write NFC tag')}
            </Button>
          )}
          <Button secondary onClick={remove}>
            {t('delete', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const QuickAccess: FC = () => {
  const t = useT();
  const modal = useModals();
  const { data: tags, mutate, isLoading } = useQuickAccessTags();
  const { data: integrations } = useIntegrations();
  const nfc = useNfcWriter();

  const openForm = useCallback(
    (tag?: QuickAccessTag) => () => {
      modal.openModal({
        title: tag
          ? t('quick_access_edit', 'Edit quick access tag')
          : t('quick_access_new', 'New quick access tag'),
        children: (close: () => void) => (
          <TagForm
            tag={tag}
            integrations={integrations || []}
            onSaved={mutate}
            onClose={close}
          />
        ),
      });
    },
    [integrations, modal, mutate, t]
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex justify-between items-start gap-[20px]">
        <div className="flex flex-col gap-[4px]">
          <h3 className="text-[20px]">{t('quick_access', 'Quick Access')}</h3>
          <div className="text-textItemBlur text-[14px]">
            {t(
              'quick_access_description',
              'Printable QR codes and writable NFC tags that jump straight to a screen, a platform, or one specific account.'
            )}
            {!nfc.supported &&
              ` ${t(
                'quick_access_nfc_note',
                'NFC writing needs Chrome on Android; everywhere else use the QR code.'
              )}`}
          </div>
        </div>
        <Button onClick={openForm()}>{t('add', 'Add')}</Button>
      </div>

      {isLoading ? (
        <div className="text-textItemBlur">{t('loading', 'Loading')}...</div>
      ) : !tags?.length ? (
        <div className="text-textItemBlur text-[14px]">
          {t('quick_access_empty', 'No tags yet. Add one to print or stick somewhere useful.')}
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {tags.map((tag) => (
            <TagCard key={tag.id} tag={tag} onChanged={mutate} />
          ))}
        </div>
      )}
    </div>
  );
};
