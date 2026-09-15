import { readJson, STORAGE_KEYS, writeJson } from '@postpls/state/storage';

export interface QuickAction {
  id: string;
  label: string;
  deepLink: string;
}

export interface MobileSettings {
  /** How often the app tries to reconcile with the host or with Drive. */
  syncIntervalMinutes: number;
  /** Sync over Google Drive when the host cannot be reached. */
  driveFallback: boolean;
  /** Raise the shortcut notification when a watched app is opened. */
  appWatcherEnabled: boolean;
  /**
   * When false the watcher only reacts to apps you have actually connected in
   * PostPls; when true, to any social app it recognises.
   */
  watchLinkedOnly: boolean;
  watchedPackages: string[];
  quickActions: QuickAction[];
  /** MAC address of the host machine, for the Wake-on-LAN button. */
  hostMacAddress: string;
}

export const DEFAULT_SETTINGS: MobileSettings = {
  syncIntervalMinutes: 15,
  driveFallback: true,
  appWatcherEnabled: false,
  watchLinkedOnly: true,
  watchedPackages: [],
  quickActions: [
    { id: 'new', label: 'New post', deepLink: 'postpls://open?target=NEW_POST' },
    { id: 'calendar', label: 'Calendar', deepLink: 'postpls://open?target=CALENDAR' },
    { id: 'sync', label: 'Sync now', deepLink: 'postpls://action?do=sync' },
  ],
  hostMacAddress: '',
};

export const loadSettings = async (): Promise<MobileSettings> => ({
  // Spread over the defaults so a build that adds a setting does not have to
  // migrate what is already on the device.
  ...DEFAULT_SETTINGS,
  ...(await readJson<Partial<MobileSettings>>(STORAGE_KEYS.settings, {})),
});

export const saveSettings = (settings: MobileSettings) =>
  writeJson(STORAGE_KEYS.settings, settings);
