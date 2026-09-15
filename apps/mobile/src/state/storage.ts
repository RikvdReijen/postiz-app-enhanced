import { Preferences } from '@capacitor/preferences';

/**
 * Thin typed wrapper over Capacitor Preferences. Everything the app persists
 * goes through here so there is one place that knows how to survive a value
 * written by an older build.
 */
export const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  const { value } = await Preferences.get({ key });
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return fallback;
  }
};

export const writeJson = async (key: string, value: unknown) => {
  await Preferences.set({ key, value: JSON.stringify(value) });
};

export const remove = async (key: string) => {
  await Preferences.remove({ key });
};

export const STORAGE_KEYS = {
  pairing: 'postpls.pairing',
  bundle: 'postpls.bundle',
  settings: 'postpls.settings',
  drive: 'postpls.drive',
} as const;
