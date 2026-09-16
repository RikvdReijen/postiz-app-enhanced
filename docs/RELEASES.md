# Debugging releases

PostPls cuts `v*-debug` pre-releases for testing on a real phone. They are not
production builds: the APK is debug-signed, so it will not upgrade over a
release build and is not something to hand to anyone you would not also hand a
stack trace.

## Cutting one

```bash
git tag -a v0.1.0-debug -m "PostPls debugging build"
git push origin v0.1.0-debug
```

Pushing the tag runs `.github/workflows/postpls-mobile-debug-apk.yml`, which
builds the debug APK and uploads it as a workflow artifact (kept 30 days).

To turn that into a downloadable release: open **Releases → Draft a new
release**, pick the tag, tick **Set as a pre-release**, and publish. Publishing
re-runs the workflow on the `release: published` event, and this time it
attaches the APK to the release itself.

## Before the first one

- Set a repository variable `POSTPLS_HOST` to your host's domain. The build
  passes it as `-PpostplsHost=`, which is what Android App Links verify against
  — without it the build uses `postpls.local` and scanned QR codes open in the
  browser rather than the app.
- For the Google Drive fallback, add `google-services.json` to `apps/mobile/android/app/`.
  The app works against the host without it; it just has no offline route.

## Installing it

The APK is debug-signed and unsigned for the Play Store, so Android will warn
about an unknown source. Enable install-from-this-source for your browser or
file manager, install, then pair the app from **Settings → Mobile App** on your
host.

## What to check in a debugging build

1. Pairing by QR from the host's Mobile App tab
2. The host pill: green, then amber with the orchestrator stopped, then red with
   the host off
3. Drafting a post with the host switched off, then bringing it back up and
   confirming the draft arrives
4. Shaking the phone to open the bug report screen
5. Writing an NFC tag from the Tags screen
