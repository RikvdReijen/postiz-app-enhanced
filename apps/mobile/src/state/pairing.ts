import { readJson, remove, STORAGE_KEYS, writeJson } from '@postpls/state/storage';

export interface Pairing {
  apiUrl: string;
  organizationId: string;
  token: string;
}

/**
 * Accepts the `postpls://pair?...` link produced by the host's Mobile App
 * settings tab, whether it arrived from a QR scan or was pasted by hand.
 */
export const parsePairingLink = (link: string): Pairing | null => {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'postpls:' || url.hostname !== 'pair') {
      return null;
    }

    const apiUrl = url.searchParams.get('url');
    const organizationId = url.searchParams.get('org');
    const token = url.searchParams.get('token');

    if (!apiUrl || !organizationId || !token) {
      return null;
    }

    return { apiUrl: apiUrl.replace(/\/$/, ''), organizationId, token };
  } catch (err) {
    return null;
  }
};

export const loadPairing = () =>
  readJson<Pairing | null>(STORAGE_KEYS.pairing, null);

export const savePairing = (pairing: Pairing) =>
  writeJson(STORAGE_KEYS.pairing, pairing);

export const clearPairing = () => remove(STORAGE_KEYS.pairing);
