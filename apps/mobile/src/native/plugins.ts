import { registerPlugin } from '@capacitor/core';

/**
 * Bridges to the Kotlin plugins in native/android. Each one exists because
 * Capacitor has no first-party equivalent and the feature is the reason the app
 * is native rather than a bookmark.
 */

export interface NfcWriterPlugin {
  isAvailable(): Promise<{ available: boolean; enabled: boolean }>;
  /** Arms the reader; the user then taps a tag against the phone. */
  writeUrl(options: { url: string }): Promise<{ written: boolean }>;
  cancel(): Promise<void>;
}

export interface AppWatcherPlugin {
  /** Usage access is a Settings-screen grant, not a runtime permission. */
  hasPermission(): Promise<{ granted: boolean }>;
  openPermissionSettings(): Promise<void>;
  /** Packages that should raise the PostPls shortcut notification. */
  setWatchedApps(options: { packages: string[] }): Promise<void>;
  /** Everything the launcher can start, so the user can pick from a real list. */
  listInstalledApps(): Promise<{
    apps: { packageName: string; label: string; social: boolean }[];
  }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
  /** Quick actions rendered on the notification, in order. */
  setQuickActions(options: {
    actions: { id: string; label: string; deepLink: string }[];
  }): Promise<void>;
}

export interface HostWakePlugin {
  /** Wake-on-LAN magic packet; see the tracking issue for the agent half. */
  wake(options: {
    macAddress: string;
    broadcastAddress?: string;
    port?: number;
  }): Promise<{ sent: boolean }>;
}

export interface GoogleDriveAuthPlugin {
  signIn(): Promise<{ email: string; accessToken: string }>;
  /** Cached token where possible, a silent refresh otherwise. */
  getAccessToken(): Promise<{ accessToken: string }>;
  signOut(): Promise<void>;
}

export const NfcWriter = registerPlugin<NfcWriterPlugin>('NfcWriter');
export const AppWatcher = registerPlugin<AppWatcherPlugin>('AppWatcher');
export const HostWake = registerPlugin<HostWakePlugin>('HostWake');
export const GoogleDriveAuth =
  registerPlugin<GoogleDriveAuthPlugin>('GoogleDriveAuth');
