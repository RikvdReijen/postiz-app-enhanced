# PostPls mobile

The Android app. It exists so you can keep drafting and rescheduling while the
machine hosting PostPls is switched off.

## How it holds together

The app never owns your posts. It carries a copy of a **sync bundle** — one
JSON document defined in `libraries/helpers/src/sync/sync.bundle.ts` and shared
verbatim with the host, so the merge rules cannot drift apart.

There are two ways that bundle travels:

| Route | When | What it can do |
| --- | --- | --- |
| **Host** | The host answers `/host/status` | Everything. The host merges and hands back the authoritative result. |
| **Google Drive** | The host is off and Drive fallback is on | Read and write the same bundle in the `PostPls` folder of your Drive. |

Whichever route is used, both sides run the same last-write-wins merge, so
switching between them mid-week loses nothing.

What the phone is allowed to change is deliberately narrow: it creates drafts
and edits or deletes its own, and it can fix the wording or the time of
something already queued. Anything that decides *when* a queued post actually
goes out is applied by the host through `PostsService`, so the Temporal workflow
stays in step. Nothing the phone writes publishes on its own.

## Native pieces

Four Kotlin plugins in `native/android`, each there because Capacitor has no
first-party equivalent and the feature is the reason this is an app and not a
bookmark:

- **NfcWriter** — writes a quick-access URL to an NFC sticker using reader mode.
- **AppWatcher** — a foreground service that notices when you open one of the
  social apps you picked and raises a notification with shortcuts into the right
  PostPls screen. Android has no callback for "an app came to the foreground"
  short of an accessibility service, so this polls `UsageStats`, which is the
  standard alternative and a much smaller permission to ask for.
- **HostWake** — Wake-on-LAN magic packet, for starting the host from the couch.
- **GoogleDriveAuth** — Google sign-in scoped to `drive.file` only, so the app
  sees the files it created and nothing else in your Drive.

## Building it

```bash
pnpm install                       # from the repo root
pnpm --filter ./apps/mobile run setup:android
```

`setup:android` runs `npx cap add android` once and then copies
`native/android` over the generated project. After that:

1. Merge `native/android/app/build.gradle.snippet` into `android/app/build.gradle`
   — it adds the Play Services auth dependency and the `postplsHost` manifest
   placeholder.
2. For the Drive fallback, create an OAuth client for Android in Google Cloud
   with the `drive.file` scope and drop `google-services.json` into
   `android/app/`. Without it the app still works against the host; it just has
   no offline route.
3. Build with your host's domain so App Links verify against it:
   `./gradlew assembleDebug -PpostplsHost=postiz.example.com`

Then `pnpm --filter ./apps/mobile run open:android`.

After changing any web code, `pnpm --filter ./apps/mobile run sync:android`
rebuilds, runs `cap sync`, and re-applies the native overlay.

## Pairing

On the host: **Settings → Mobile App → Show pairing code**. Scan it, or paste
the `postpls://pair?...` link into the app's pairing screen.

The pairing code carries a JWT that signs the phone in as you — the same
credential the browser holds in its auth cookie. Treat it like a password.
There is currently no per-device revocation: revoking means rotating
`JWT_SECRET`, which signs every device out.

## Not yet done

- No device test. None of the Kotlin has run on real hardware — it is written
  against the documented APIs but has not been proven.
- Background sync only runs while the app is alive. A WorkManager job is the
  right fix.
- Wake-on-LAN only works on the same network as the host. See the tracking
  issue for the remote path.
