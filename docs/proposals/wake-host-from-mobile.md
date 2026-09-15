# Start the PostPls host from the phone (Wake-on-LAN, and beyond the LAN)

> Intended as a GitHub issue, but Issues are disabled on this repository. Paste
> this into an issue once they are enabled, or keep tracking it here.

## Why

PostPls assumes the host is a machine that gets switched off. The Android app
already handles that on the read side — it keeps drafting against the Google
Drive bundle and shows a red "Host offline" pill. What it cannot do is *fix* it.
Right now the answer to "my post is queued but the machine is asleep" is to walk
over and press the power button.

## What already exists

- `apps/mobile/native/android/.../HostWakePlugin.kt` — sends a Wake-on-LAN magic
  packet. It derives the subnet's directed broadcast address from the phone's
  own DHCP lease, because a lot of consumer routers drop `255.255.255.255`.
- A **Host MAC address** field in the app's settings.
- A **Wake host** button on the home screen, shown only when the host is offline
  *and* a MAC is configured.

None of it has run on a device.

## What's missing

### 1. Verify the LAN path actually works

The plugin is written against the documented APIs and nothing more. Needs a real
test:

- [ ] Magic packet reaches a machine on the same Wi-Fi and wakes it
- [ ] `WifiManager.getDhcpInfo()` is deprecated; check it still returns a usable
      netmask on Android 13+, and fall back to
      `ConnectivityManager`/`LinkProperties` if not
- [ ] Behaviour on a phone with no Wi-Fi (mobile data only) — should fail with a
      clear message, not silently
- [ ] Confirm whether the target needs WoL enabled in both BIOS *and* the NIC
      driver's power management, and put that in the app's help text

### 2. Tell the user whether it worked

WoL is fire-and-forget: the plugin returns `{sent: true}` whether or not anything
woke up. After sending, the app should poll `/host/status` for ~60s and report
"Host is up" or "No response — check Wake-on-LAN is enabled". Right now the only
feedback is the status pill changing on its own.

### 3. Off the LAN

The interesting case, and the one this issue is really about. A magic packet does
not route over the internet. Options, roughly in order of how much they ask of
the user:

| Approach | How | Cost |
| --- | --- | --- |
| **Router forwarding** | Forward a UDP port to the subnet broadcast | No new code; many routers can't do it, and it exposes a wake port |
| **VPN** | Tailscale/WireGuard, wake from inside the tunnel | No new code, and the honest recommendation for most people |
| **A tiny always-on agent** | A Pi or NAS on the LAN exposes an authenticated `POST /wake` and sends the packet | New component to build, secure and ship |
| **Vendor BMC** | IPMI / iDRAC / AMT where the hardware has it | Server hardware only |

A wake endpoint is a remote power switch, so if we build the agent it needs a
real token (not a shared secret in a config file), rate limiting, and a MAC
allowlist. **It should not live in the backend** — the backend is on the machine
that is off.

Worth considering: for most people the VPN row is the right answer and we should
just document it rather than building the agent.

### 4. Related: don't need the host awake as often

Partly a design escape hatch. If the orchestrator misses a post because the host
was off, the planner sweep picks it up when it comes back — see
`missingPostWorkflowV2` and the configurable lookback window. Waking the machine
to publish on time is a nicer outcome, but the sweep means a sleeping host is
late rather than broken. That lowers the priority of the remote path.

## Suggested order

1. Device-test the LAN path (#1) and add wake feedback (#2) — small, and makes
   the shipped button honest
2. Document the VPN approach in `apps/mobile/README.md` (#3) — free
3. Only build the agent if people actually want it
