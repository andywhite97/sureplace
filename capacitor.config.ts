import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twinpeaksinvestment.sureplace.prototype',
  appName: 'SurePlace Test',
  webDir: 'dist/mobile/browser',
  backgroundColor: '#f6f9f8',
  loggingBehavior: 'none',
  server: { androidScheme: 'https' },
  plugins: {
    // Angular HttpClient uses XHR, which this patches to the native transport.
    // Keep the remote API on HTTPS without changing the web backend's CORS policy.
    CapacitorHttp: { enabled: true },
    Keyboard: { resizeOnFullScreen: true },
  },
};

export default config;
