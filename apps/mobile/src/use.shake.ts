import { useEffect, useRef } from 'react';
import {
  createShakeDetector,
  DEFAULT_SHAKE_THRESHOLD,
} from '@gitroom/helpers/shake/shake.detector';

/**
 * Same detector the web app uses, so a sensitivity tuned on one behaves the
 * same on the other.
 */
export const useShake = (
  enabled: boolean,
  threshold: number | undefined,
  onShake: () => void
) => {
  const handler = useRef(onShake);
  handler.current = onShake;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const detector = createShakeDetector({
      threshold: threshold || DEFAULT_SHAKE_THRESHOLD,
      onShake: () => handler.current(),
    });

    let started = false;
    detector.start().then((ok) => {
      started = ok;
    });

    return () => {
      if (started) {
        detector.stop();
      }
    };
  }, [enabled, threshold]);
};
