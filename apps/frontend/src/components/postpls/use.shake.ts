'use client';

import { useEffect, useRef } from 'react';
import {
  createShakeDetector,
  DEFAULT_SHAKE_THRESHOLD,
} from '@gitroom/helpers/shake/shake.detector';

/**
 * Starts listening for a shake while `enabled` is true.
 *
 * The callback is held in a ref so a re-render with a new closure does not tear
 * the listener down and rebuild it — which on some devices drops the first
 * shake after every render.
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
