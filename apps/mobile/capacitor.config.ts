import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.postpls.mobile',
  appName: 'PostPls',
  webDir: 'dist',
  android: {
    // The host is usually a self-hosted machine on a LAN with a self-signed
    // certificate or plain http, so cleartext has to be allowed for the app to
    // be usable at all. The manifest narrows this with a network security
    // config rather than leaving it open globally.
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      // Routes fetch() through native, which sidesteps CORS against a host that
      // only whitelists the web frontend's origin.
      enabled: true,
    },
  },
};

export default config;
