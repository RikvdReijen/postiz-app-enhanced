import { createShakeDetector } from './shake.detector';

type Listener = (event: any) => void;

/**
 * A minimal stand-in for the browser bits the detector touches. jsdom is not
 * in this project's test setup, and the detector only needs three of them.
 */
const installWindow = () => {
  const listeners: Record<string, Listener[]> = {};

  const fakeWindow = {
    DeviceMotionEvent: function () {},
    addEventListener: (name: string, listener: Listener) => {
      listeners[name] = [...(listeners[name] || []), listener];
    },
    removeEventListener: (name: string, listener: Listener) => {
      listeners[name] = (listeners[name] || []).filter((l) => l !== listener);
    },
  };

  (global as any).window = fakeWindow;

  return {
    emit(reading: { x: number; y: number; z: number }) {
      for (const listener of listeners['devicemotion'] || []) {
        listener({ acceleration: reading, accelerationIncludingGravity: reading });
      }
    },
    get listenerCount() {
      return (listeners['devicemotion'] || []).length;
    },
  };
};

describe('createShakeDetector', () => {
  let now = 0;
  let dateSpy: jest.SpyInstance;

  beforeEach(() => {
    now = 1_000_000;
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    dateSpy.mockRestore();
    delete (global as any).window;
  });

  /** Samples closer together than 100ms are ignored by design. */
  const advance = (ms = 120) => {
    now += ms;
  };

  it('fires when the phone is moved sharply', async () => {
    const motion = installWindow();
    const onShake = jest.fn();
    const detector = createShakeDetector({ threshold: 18, onShake });

    expect(await detector.start()).toBe(true);

    // First sample only establishes a baseline.
    motion.emit({ x: 0, y: 0, z: 0 });
    advance();
    motion.emit({ x: 10, y: 10, z: 10 });

    expect(onShake).toHaveBeenCalledTimes(1);
  });

  it('ignores slow movement, so carrying the phone never reports a bug', async () => {
    const motion = installWindow();
    const onShake = jest.fn();
    const detector = createShakeDetector({ threshold: 18, onShake });
    await detector.start();

    motion.emit({ x: 0, y: 0, z: 0 });
    for (let step = 1; step <= 5; step++) {
      advance(1000);
      motion.emit({ x: step, y: 0, z: 0 });
    }

    expect(onShake).not.toHaveBeenCalled();
  });

  it('does not fire twice inside the cooldown', async () => {
    const motion = installWindow();
    const onShake = jest.fn();
    const detector = createShakeDetector({
      threshold: 18,
      cooldownMs: 2000,
      onShake,
    });
    await detector.start();

    motion.emit({ x: 0, y: 0, z: 0 });
    advance();
    motion.emit({ x: 10, y: 10, z: 10 });

    // The reversal straight afterwards is just as sharp, but suppressed — one
    // wobble of the wrist is one report, not three.
    advance();
    motion.emit({ x: 0, y: 0, z: 0 });
    expect(onShake).toHaveBeenCalledTimes(1);

    // Past the cooldown a fresh shake counts again. It has to be an actually
    // fast movement: the detector measures rate of change, so simply waiting
    // and then moving slowly is correctly ignored.
    advance(2500);
    motion.emit({ x: 0, y: 0, z: 0 });
    advance();
    motion.emit({ x: 10, y: 10, z: 10 });
    expect(onShake).toHaveBeenCalledTimes(2);
  });

  it('a higher threshold takes a harder shake', async () => {
    const motion = installWindow();
    const onShake = jest.fn();
    const detector = createShakeDetector({ threshold: 400, onShake });
    await detector.start();

    motion.emit({ x: 0, y: 0, z: 0 });
    advance();
    motion.emit({ x: 10, y: 10, z: 10 });

    expect(onShake).not.toHaveBeenCalled();
  });

  it('stops listening when told to', async () => {
    const motion = installWindow();
    const onShake = jest.fn();
    const detector = createShakeDetector({ threshold: 18, onShake });

    await detector.start();
    expect(motion.listenerCount).toBe(1);

    detector.stop();
    expect(motion.listenerCount).toBe(0);

    motion.emit({ x: 0, y: 0, z: 0 });
    advance();
    motion.emit({ x: 10, y: 10, z: 10 });
    expect(onShake).not.toHaveBeenCalled();
  });

  it('reports unsupported when the device has no motion events', async () => {
    const onShake = jest.fn();
    const detector = createShakeDetector({ onShake });

    expect(detector.supported).toBe(false);
    expect(await detector.start()).toBe(false);
  });
});
