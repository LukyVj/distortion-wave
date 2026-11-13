import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { distortionWave } from 'distortion-wave';

// distortionWave() captures the element right after your update returns, so React has to render
// synchronously: flushSync does that (same as with document.startViewTransition).
//
//   const wave = useWave({ duration: 1200 });
//   <button onClick={(e) => wave(cardRef, () => setOpen(true), { source: e.currentTarget, focus: e })}>
export function useWave(defaults) {
  return useCallback((target, update, options) => {
    const el = target && 'current' in target ? target.current : target;
    if (!el) { update(); return null; }
    return distortionWave(el, () => flushSync(update), { ...defaults, ...options });
  }, [defaults]);
}
