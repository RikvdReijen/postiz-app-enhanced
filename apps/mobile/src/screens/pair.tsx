import { FC, useState } from 'react';
import { BRAND_NAME, BRAND_TAGLINE } from '@gitroom/helpers/branding/branding';
import { Button, Card, Field, TextArea } from '@postpls/components/ui';
import { Pairing, parsePairingLink } from '@postpls/state/pairing';

export const PairScreen: FC<{ onPaired: (pairing: Pairing) => void }> = ({
  onPaired,
}) => {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const pairing = parsePairingLink(link);
    if (!pairing) {
      setError(
        'That does not look like a pairing link. It should start with postpls://pair'
      );
      return;
    }

    setError('');
    onPaired(pairing);
  };

  return (
    <div className="flex flex-col gap-[20px] p-[20px]">
      <div className="flex items-center gap-[12px]">
        <img src="/postpls/envelope-pray.svg" width={48} height={48} alt="" />
        <div>
          <div className="text-[22px] font-[600] leading-[1.1]">{BRAND_NAME}</div>
          <div className="text-[12px] text-textItemBlur">{BRAND_TAGLINE}</div>
        </div>
      </div>

      <Card>
        <div className="text-[15px]">Pair with your host</div>
        <div className="text-[13px] text-textItemBlur">
          On your host, open Settings → Mobile App and show the pairing code.
          Scan it, or paste the link here.
        </div>

        <Field label="Pairing link">
          <TextArea
            rows={4}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="postpls://pair?url=…&org=…&token=…"
          />
        </Field>

        {!!error && <div className="text-[13px] text-ai">{error}</div>}

        <Button onClick={submit} disabled={!link.trim()}>
          Pair
        </Button>
      </Card>
    </div>
  );
};
