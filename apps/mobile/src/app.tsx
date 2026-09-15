import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { SyncBundle, SyncPost, emptySyncBundle } from '@gitroom/helpers/sync/sync.bundle';
import { BRAND_NAME } from '@gitroom/helpers/branding/branding';
import {
  clearPairing,
  loadPairing,
  Pairing,
  parsePairingLink,
  savePairing,
} from '@postpls/state/pairing';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  MobileSettings,
  saveSettings,
} from '@postpls/state/settings';
import {
  deleteLocalPost,
  loadBundle,
  SyncOutcome,
  syncNow,
  upsertLocalPost,
} from '@postpls/state/sync';
import { HostHealth, HostTransport } from '@postpls/state/host.transport';
import { AppWatcher, HostWake } from '@postpls/native/plugins';
import { PairScreen } from '@postpls/screens/pair';
import { HomeScreen } from '@postpls/screens/home';
import { ComposerScreen } from '@postpls/screens/composer';
import { QuickAccessScreen } from '@postpls/screens/quick.access';
import { SettingsScreen } from '@postpls/screens/settings';

type Tab = 'home' | 'quick' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Posts' },
  { id: 'quick', label: 'Tags' },
  { id: 'settings', label: 'Settings' },
];

export const App: FC = () => {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [settings, setSettings] = useState<MobileSettings>(DEFAULT_SETTINGS);
  const [bundle, setBundle] = useState<SyncBundle | null>(null);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);
  const [health, setHealth] = useState<HostHealth | null>(null);
  const [driveEmail, setDriveEmail] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [editing, setEditing] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const boot = async () => {
      const [storedPairing, storedSettings] = await Promise.all([
        loadPairing(),
        loadSettings(),
      ]);

      setPairing(storedPairing);
      setSettings(storedSettings);

      if (storedPairing) {
        setBundle(await loadBundle(storedPairing.organizationId));
      }

      setBooted(true);
    };

    boot();
  }, []);

  const runSync = useCallback(async () => {
    if (!pairing || syncing) {
      return;
    }

    setSyncing(true);
    try {
      const result = await syncNow(pairing, settings);
      setOutcome(result);
      setBundle(await loadBundle(pairing.organizationId));

      setHealth(
        result.hostOnline ? await new HostTransport(pairing).health() : null
      );
    } finally {
      setSyncing(false);
    }
  }, [pairing, settings, syncing]);

  // A ref so the interval below never has to be torn down and rebuilt just
  // because a dependency of runSync changed.
  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  useEffect(() => {
    if (!pairing) {
      return;
    }

    runSyncRef.current();
    const interval = setInterval(
      () => runSyncRef.current(),
      settings.syncIntervalMinutes * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [pairing, settings.syncIntervalMinutes]);

  // Sync when the app comes back to the foreground; a phone that was in a
  // pocket all morning should not show a stale calendar.
  useEffect(() => {
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        runSyncRef.current();
      }
    });

    return () => {
      handle.then((listener) => listener.remove());
    };
  }, []);

  /** Deep links arrive from QR scans, NFC taps and the watcher notification. */
  const handleDeepLink = useCallback((url: string) => {
    const pairFromLink = parsePairingLink(url);
    if (pairFromLink) {
      savePairing(pairFromLink).then(() => setPairing(pairFromLink));
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'action' && parsed.searchParams.get('do') === 'sync') {
        runSyncRef.current();
        return;
      }

      if (parsed.hostname === 'open') {
        const target = parsed.searchParams.get('target');
        if (target === 'NEW_POST' || target === 'PROVIDER' || target === 'ACCOUNT') {
          setEditing(null);
          setComposing(true);
          return;
        }

        setComposing(false);
        setTab(target === 'SETTINGS' ? 'settings' : 'home');
      }
    } catch (err) {
      // A link we do not understand is not worth interrupting anyone over.
    }
  }, []);

  useEffect(() => {
    const handle = CapacitorApp.addListener('appUrlOpen', ({ url }) =>
      handleDeepLink(url)
    );

    return () => {
      handle.then((listener) => listener.remove());
    };
  }, [handleDeepLink]);

  // Push the watcher configuration down to the native service whenever it
  // changes, so the notification always reflects what is on screen here.
  useEffect(() => {
    if (!booted) {
      return;
    }

    const apply = async () => {
      try {
        await AppWatcher.setQuickActions({ actions: settings.quickActions });
        await AppWatcher.setWatchedApps({ packages: settings.watchedPackages });

        if (settings.appWatcherEnabled && settings.watchedPackages.length) {
          await AppWatcher.start();
        } else {
          await AppWatcher.stop();
        }
      } catch (err) {
        // The plugin is absent on web, where this screen is only ever a preview.
      }
    };

    apply();
  }, [
    booted,
    settings.appWatcherEnabled,
    settings.quickActions,
    settings.watchedPackages,
  ]);

  const updateSettings = useCallback((next: MobileSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const savePost = useCallback(
    async (post: Omit<SyncPost, 'updatedAt' | 'origin'>) => {
      if (!bundle) {
        return;
      }

      setBundle(await upsertLocalPost(bundle, post));
      setComposing(false);
      setEditing(null);
      runSyncRef.current();
    },
    [bundle]
  );

  const removePost = useCallback(
    async (id: string) => {
      if (!bundle) {
        return;
      }

      setBundle(await deleteLocalPost(bundle, id));
      setComposing(false);
      setEditing(null);
      runSyncRef.current();
    },
    [bundle]
  );

  const wakeHost = useCallback(async () => {
    if (!settings.hostMacAddress) {
      return;
    }

    try {
      await HostWake.wake({ macAddress: settings.hostMacAddress });
    } catch (err) {
      // Wake-on-LAN is fire and forget; the status pill is the real feedback.
    }
  }, [settings.hostMacAddress]);

  const unpair = useCallback(async () => {
    await clearPairing();
    setPairing(null);
    setBundle(null);
    setOutcome(null);
  }, []);

  if (!booted) {
    return (
      <div className="h-full flex items-center justify-center text-textItemBlur">
        {BRAND_NAME}
      </div>
    );
  }

  if (!pairing) {
    return (
      <PairScreen
        onPaired={async (next) => {
          await savePairing(next);
          setPairing(next);
          setBundle(emptySyncBundle(next.organizationId, 'mobile'));
        }}
      />
    );
  }

  const currentBundle = bundle || emptySyncBundle(pairing.organizationId, 'mobile');

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        {composing || editing ? (
          <ComposerScreen
            bundle={currentBundle}
            postId={editing}
            onSave={savePost}
            onDelete={removePost}
            onCancel={() => {
              setComposing(false);
              setEditing(null);
            }}
          />
        ) : tab === 'home' ? (
          <HomeScreen
            bundle={currentBundle}
            health={health}
            outcome={outcome}
            settings={settings}
            syncing={syncing}
            onSync={runSync}
            onWakeHost={wakeHost}
            onCompose={() => {
              setEditing(null);
              setComposing(true);
            }}
            onEdit={setEditing}
          />
        ) : tab === 'quick' ? (
          <QuickAccessScreen
            pairing={pairing}
            hostOnline={!!outcome?.hostOnline}
          />
        ) : (
          <SettingsScreen
            settings={settings}
            onChange={updateSettings}
            onUnpair={unpair}
            driveEmail={driveEmail}
            onDriveEmail={setDriveEmail}
          />
        )}
      </div>

      <div className="flex border-t border-newBorder bg-newBgColorInner">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setComposing(false);
              setEditing(null);
              setTab(item.id);
            }}
            className={`flex-1 py-[14px] text-[13px] ${
              tab === item.id && !composing && !editing
                ? 'text-newTextColor'
                : 'text-textItemBlur'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
