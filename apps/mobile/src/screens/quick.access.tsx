import { FC, useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@postpls/components/ui';
import { NfcWriter } from '@postpls/native/plugins';
import { Pairing } from '@postpls/state/pairing';

interface QuickAccessTag {
  id: string;
  name: string;
  target: string;
  url: string;
}

/**
 * The write half of the quick-access feature. Designing a tag happens on the
 * host, where there is a screen big enough for it; the phone is what actually
 * touches the sticker.
 */
export const QuickAccessScreen: FC<{ pairing: Pairing; hostOnline: boolean }> = ({
  pairing,
  hostOnline,
}) => {
  const [tags, setTags] = useState<QuickAccessTag[]>([]);
  const [status, setStatus] = useState('');
  const [nfc, setNfc] = useState({ available: false, enabled: false });
  const [writingId, setWritingId] = useState('');

  useEffect(() => {
    NfcWriter.isAvailable().then(setNfc).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hostOnline) {
      return;
    }

    fetch(`${pairing.apiUrl}/quick-access`, {
      headers: { auth: pairing.token, showorg: pairing.organizationId },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then(setTags)
      .catch(() => setTags([]));
  }, [hostOnline, pairing]);

  const write = useCallback(
    async (tag: QuickAccessTag) => {
      setWritingId(tag.id);
      setStatus('Hold an NFC tag against the back of the phone…');

      try {
        await NfcWriter.writeUrl({ url: tag.url });
        setStatus(`Written: ${tag.name}`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Could not write the tag');
      } finally {
        setWritingId('');
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <Card>
        <div className="text-[15px]">Quick access tags</div>
        <div className="text-[13px] text-textItemBlur">
          {!nfc.available
            ? 'This phone has no NFC hardware, so tags can only be printed as QR codes from the host.'
            : !nfc.enabled
            ? 'NFC is switched off. Turn it on in Android settings to write tags.'
            : 'Pick a tag, then hold a blank NFC sticker against the back of the phone.'}
        </div>
        {!!status && <div className="text-[13px]">{status}</div>}
      </Card>

      {!hostOnline ? (
        <Card>
          <div className="text-[14px] text-textItemBlur">
            Tags live on the host. Start it up to write or re-point them.
          </div>
        </Card>
      ) : !tags.length ? (
        <Card>
          <div className="text-[14px] text-textItemBlur">
            No tags yet. Create them on the host under Settings → Quick Access.
          </div>
        </Card>
      ) : (
        tags.map((tag) => (
          <Card key={tag.id}>
            <div className="text-[15px]">{tag.name}</div>
            <div className="text-[12px] text-textItemBlur break-all">{tag.url}</div>
            <Button
              onClick={() => write(tag)}
              disabled={!nfc.available || !nfc.enabled}
              loading={writingId === tag.id}
            >
              Write to NFC tag
            </Button>
          </Card>
        ))
      )}
    </div>
  );
};
