/**
 * Shake detection, shared by the web app and the Android app so both agree on
 * what counts as a shake and a threshold tuned on one works on the other.
 *
 * Framework-free on purpose — each app wraps it in its own hook.
 */

export interface ShakeDetectorOptions {
  /** Peak acceleration in m/s². Lower is more sensitive. */
  threshold?: number;
  /** How long to ignore further shakes after one fires. */
  cooldownMs?: number;
  onShake: () => void;
}

export const DEFAULT_SHAKE_THRESHOLD = 18;
const DEFAULT_COOLDOWN_MS = 2000;
/** Ignore samples closer together than this; phones report far faster. */
const SAMPLE_INTERVAL_MS = 100;

export interface ShakeDetector {
  supported: boolean;
  /**
   * Resolves false when motion access is unavailable or refused. iOS gates
   * DeviceMotion behind a user-gesture permission prompt; Android does not,
   * but asking is harmless there.
   */
  start(): Promise<boolean>;
  stop(): void;
}

const motionEvent = (): any =>
  typeof window === 'undefined' ? null : (window as any).DeviceMotionEvent;

export const createShakeDetector = (
  options: ShakeDetectorOptions
): ShakeDetector => {
  const threshold = options.threshold ?? DEFAULT_SHAKE_THRESHOLD;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  let lastSampleAt = 0;
  let lastShakeAt = 0;
  let last = { x: 0, y: 0, z: 0 };
  let listening = false;

  const handle = (event: DeviceMotionEvent) => {
    // `acceleration` already excludes gravity, which is what we want; not every
    // device populates it, so fall back to the with-gravity reading. The
    // measure below is a delta between samples, so the constant gravity term
    // cancels out either way.
    const reading = event.acceleration?.x
      ? event.acceleration
      : event.accelerationIncludingGravity;

    if (!reading) {
      return;
    }

    const now = Date.now();
    if (now - lastSampleAt < SAMPLE_INTERVAL_MS) {
      return;
    }

    const elapsed = now - lastSampleAt;
    lastSampleAt = now;

    const x = reading.x || 0;
    const y = reading.y || 0;
    const z = reading.z || 0;

    // Rate of change across all three axes. A shake is a fast reversal, which
    // shows up here far more strongly than in raw magnitude — that way simply
    // holding the phone at an angle never trips it.
    const delta =
      (Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z)) /
      elapsed;
    const speed = delta * 1000;

    last = { x, y, z };

    if (speed > threshold && now - lastShakeAt > cooldownMs) {
      lastShakeAt = now;
      options.onShake();
    }
  };

  return {
    supported: !!motionEvent(),

    async start() {
      const DeviceMotion = motionEvent();
      if (!DeviceMotion || listening) {
        return false;
      }

      if (typeof DeviceMotion.requestPermission === 'function') {
        try {
          if ((await DeviceMotion.requestPermission()) !== 'granted') {
            return false;
          }
        } catch (err) {
          // Throws unless called from a user gesture; treat as unavailable
          // rather than breaking the screen that asked.
          return false;
        }
      }

      window.addEventListener('devicemotion', handle);
      listening = true;
      return true;
    },

    stop() {
      if (!listening) {
        return;
      }

      window.removeEventListener('devicemotion', handle);
      listening = false;
    },
  };
};
