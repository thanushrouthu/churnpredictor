import React, { useState, useEffect, useRef } from 'react';

/**
 * CountUp
 * Smoothly animates numerical transitions over time with ease-out cubic easing.
 * When prefers-reduced-motion is active, displays the final number immediately.
 */
export default function CountUp({
  end,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 750,
  className = '',
}) {
  const [displayValue, setDisplayValue] = useState(end);
  const startValRef = useRef(end);
  const startTimeRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      setDisplayValue(end);
      startValRef.current = end;
      return;
    }

    const startVal = startValRef.current;
    const diff = end - startVal;
    if (diff === 0) {
      setDisplayValue(end);
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic: 1 - Math.pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * ease;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
        startValRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration]);

  const formatted =
    typeof displayValue === 'number'
      ? displayValue.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : displayValue;

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
