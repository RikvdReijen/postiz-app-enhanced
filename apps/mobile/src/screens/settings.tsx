import { FC, useCallback, useEffect, useState } from 'react';
import { Button, Card, Field, TextInput, Toggle } from '@postpls/components/ui';
import { MobileSettings } from '@postpls/state/settings';
import { AppWatcher, GoogleDriveAuth } from '@postpls/native/plugins';

const SYNC_INTERVALS = [5, 15, 30, 60, 180, 360];

interface InstalledApp {
  packageName: string;
  label: string;
  social: boolean;
}

export const SettingsScreen: FC<{
  settings: MobileSettings;
  onChange: (settings: MobileSettings) => void;
  onUnpair: () => void;
  driveEmail: string;
  onDriveEmail: (email: string) => void;
}> = ({ settings, onChange, onUnpair, driveEmail, onDriveEmail }) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [watcherGranted, setWatcherGranted] = useState(true);
  const [showAllApps, setShowAllApps] = useState(false);

  useEffect(() => {
    AppWatcher.hasPermission()
      .then(({ granted }) => setWatcherGranted(granted))
      .catch(() => undefined);

    AppWatcher.listInstalledApps()
      .then(({ apps: installed }) => setApps(installed))
      .catch(() => setApps([]));
  }, []);

  const update = useCallback(
    (patch: Partial<MobileSettings>) => onChange({ ...settings, ...patch }),
    [onChange, settings]
  );

  const toggleWatched = useCallback(
    (packageName: string) =>
      update({
        watchedPackages: settings.watchedPackages.includes(packageName)
          ? settings.watchedPackages.filter((p) => p !== packageName)
          : [...settings.watchedPackages, packageName],
      }),
    [settings.watchedPackages, update]
  );

  const connectDrive = useCallback(async () => {
    try {
      const { email } = await GoogleDriveAuth.signIn();
      onDriveEmail(email);
    } catch (err) {
      onDriveEmail('');
    }
  }, [onDriveEmail]);

  // "Linked only" means the apps you have actually connected in PostPls; the
  // host tells us which those are through the provider ids in the bundle.
  const visibleApps = showAllApps ? apps : apps.filter((app) => app.social);

  return (
    <div className="flex flex-col gap-[16px] p-[16px]">
      <Card>
        <div className="text-[15px]">Sync</div>

        <Field label="Try to sync every">
          <select
            value={settings.syncIntervalMinutes}
            onChange={(e) =>
              update({ syncIntervalMinutes: Number(e.target.value) })
            }
            className="bg-newBgLineColor border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[15px] text-newTextColor outline-none w-full"
          >
            {SYNC_INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}
              </option>
            ))}
          </select>
        </Field>

        <Toggle
          label="Use Google Drive when the host is off"
          hint={driveEmail ? `Connected as ${driveEmail}` : 'Not connected'}
          checked={settings.driveFallback}
          onChange={(driveFallback) => update({ driveFallback })}
        />

        {settings.driveFallback && !driveEmail && (
          <Button secondary onClick={connectDrive}>
            Connect Google Drive
          </Button>
        )}
      </Card>

      <Card>
        <div className="text-[15px]">When you open a social app</div>
        <div className="text-[13px] text-textItemBlur">
          Shows a PostPls notification with shortcuts into the right screen, so
          you can schedule the thing you just thought of instead of losing it.
        </div>

        <Toggle
          label="Watch for social apps"
          checked={settings.appWatcherEnabled}
          onChange={(appWatcherEnabled) => update({ appWatcherEnabled })}
        />

        {settings.appWatcherEnabled && !watcherGranted && (
          <>
            <div className="text-[13px] text-ai">
              Android needs usage access for this. It is granted from a Settings
              screen, not a normal permission prompt.
            </div>
            <Button secondary onClick={() => AppWatcher.openPermissionSettings()}>
              Grant usage access
            </Button>
          </>
        )}

        {settings.appWatcherEnabled && (
          <>
            <Toggle
              label="Linked accounts only"
              hint="Off: react to any social app on the phone"
              checked={settings.watchLinkedOnly}
              onChange={(watchLinkedOnly) => update({ watchLinkedOnly })}
            />

            <button
              type="button"
              className="text-[13px] text-textItemBlur text-start underline"
              onClick={() => setShowAllApps((value) => !value)}
            >
              {showAllApps ? 'Show recognised apps only' : 'Show all apps'}
            </button>

            <div className="flex flex-col gap-[8px] max-h-[280px] overflow-auto">
              {visibleApps.map((app) => (
                <Toggle
                  key={app.packageName}
                  label={app.label}
                  hint={app.packageName}
                  checked={settings.watchedPackages.includes(app.packageName)}
                  onChange={() => toggleWatched(app.packageName)}
                />
              ))}
              {!visibleApps.length && (
                <div className="text-[13px] text-textItemBlur">
                  No apps to show.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Card>
        <div className="text-[15px]">Host</div>
        <Field label="Host MAC address (for Wake-on-LAN)">
          <TextInput
            value={settings.hostMacAddress}
            onChange={(e) => update({ hostMacAddress: e.target.value })}
            placeholder="AA:BB:CC:DD:EE:FF"
            autoCapitalize="characters"
          />
        </Field>
        <div className="text-[12px] text-textItemBlur">
          Sends a magic packet on the local network. The machine has to have
          Wake-on-LAN enabled in its BIOS and network adapter.
        </div>

        <Button secondary onClick={onUnpair}>
          Unpair this device
        </Button>
      </Card>
    </div>
  );
};
