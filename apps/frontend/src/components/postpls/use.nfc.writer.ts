'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Web NFC, which today means Chrome on Android. Everywhere else the hook
 * reports `supported: false` so the UI can offer the QR code instead of a
 * button that would silently do nothing.
 */
interface NdefWriter {
  write(message: {
    records: { recordType: string; data: string }[];
  }): Promise<void>;
}

export const useNfcWriter = () => {
  const [supported, setSupported] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'NDEFReader' in window);
  }, []);

  const write = useCallback(async (url: string) => {
    const Writer = (window as any).NDEFReader;
    if (!Writer) {
      throw new Error('NFC is not available on this device');
    }

    setWriting(true);
    try {
      const writer: NdefWriter = new Writer();
      await writer.write({ records: [{ recordType: 'url', data: url }] });
    } finally {
      setWriting(false);
    }
  }, []);

  return { supported, writing, write };
};
