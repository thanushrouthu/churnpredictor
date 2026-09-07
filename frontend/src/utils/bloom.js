/**
 * Tactile 3D Bloom Press Effect Engine
 * 
 * Provides physics-based compression (3-5% scale-down) on press,
 * emits a soft monochrome radial bloom expanding from the exact point of contact,
 * and springs back with an elastic overshoot curve on release (300-450ms).
 * 
 * Guarantees:
 * - pointer-events: none on all bloom layers (never blocks clicks/inputs)
 * - Identical behavior for mouse (mousedown) and touch (touchstart)
 * - Intensity scaling: primary, secondary, subtle
 * - Full prefers-reduced-motion support (disables transforms and shockwaves)
 * - Non-blocking async action handling
 */

let initialized = false;

export function initTactileBloom() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Helper to find closest bloom target
  function getBloomTarget(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    // Strictly skip native text/password/email/search inputs to prevent typing interference
    if (el.tagName === 'INPUT' && !['button', 'submit', 'range', 'checkbox', 'radio'].includes(el.type)) {
      return null;
    }
    return el.closest(
      '[data-bloom], .bloom-target, button, [role="button"], [role="switch"], .select-bloom-wrapper, a, input[type="range"]'
    );
  }

  // Active pressed tracking
  let currentTarget = null;
  let activeFlare = null;

  function handlePointerDown(e) {
    // Only primary button or touch
    if (e.button !== undefined && e.button !== 0) return;

    const target = getBloomTarget(e.target);
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;

    currentTarget = target;

    const isReduced = motionQuery.matches;
    const intensity = target.getAttribute('data-bloom') || (
      target.id === 'btn-submit-auth' || 
      target.id === 'submit-predict-btn' || 
      target.id?.startsWith('btn-preset')
        ? 'primary'
        : target.id?.startsWith('btn-toggle') || target.id?.startsWith('link-')
        ? 'subtle'
        : 'secondary'
    );

    // Apply press compression state
    target.classList.add('bloom-target', 'is-bloom-pressed');
    target.setAttribute('data-bloom-active', intensity);

    if (isReduced) {
      // Reduced motion fallback: gentle opacity flash only, no scale/expansion
      target.classList.add('is-bloom-reduced-flash');
      return;
    }

    // Determine contact coordinates relative to element bounding box
    const rect = target.getBoundingClientRect();
    let x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    let y = e.clientY ? e.clientY - rect.top : rect.height / 2;

    // Constrain within bounds
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));

    target.style.setProperty('--bloom-x', `${x}px`);
    target.style.setProperty('--bloom-y', `${y}px`);

    // Ensure target position allows absolute child overlay
    const computedPos = window.getComputedStyle(target).position;
    if (computedPos === 'static') {
      target.style.position = 'relative';
    }

    // Remove any lingering flares in target
    const oldFlares = target.querySelectorAll('.bloom-shockwave-flare');
    oldFlares.forEach((f) => f.remove());

    // Create soft radial bloom flare element (STRICTLY pointer-events: none)
    const flare = document.createElement('span');
    flare.className = `bloom-shockwave-flare bloom-${intensity}`;
    flare.setAttribute('aria-hidden', 'true');
    flare.style.left = `${x}px`;
    flare.style.top = `${y}px`;

    // Safety guarantee: Ensure pointer events are never captured
    flare.style.pointerEvents = 'none';

    target.appendChild(flare);
    activeFlare = flare;

    // Clean up flare after animation concludes
    const cleanup = () => {
      if (flare && flare.parentNode) {
        flare.parentNode.removeChild(flare);
      }
      if (activeFlare === flare) activeFlare = null;
    };

    flare.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 550);
  }

  function handlePointerUp() {
    if (!currentTarget) return;

    const target = currentTarget;
    currentTarget = null;

    target.classList.remove('is-bloom-pressed', 'is-bloom-reduced-flash');
    target.classList.add('is-bloom-releasing');

    // Remove releasing class after spring animation settles
    setTimeout(() => {
      target.classList.remove('is-bloom-releasing');
      target.removeAttribute('data-bloom-active');
    }, 450);
  }

  function handlePointerCancel() {
    if (!currentTarget) return;
    currentTarget.classList.remove('is-bloom-pressed', 'is-bloom-releasing', 'is-bloom-reduced-flash');
    currentTarget.removeAttribute('data-bloom-active');
    currentTarget = null;
  }

  // Bind delegated events to window
  window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true, capture: true });
  window.addEventListener('pointercancel', handlePointerCancel, { passive: true, capture: true });

  // Cleanup handler in case pointer leaves element or window
  window.addEventListener('blur', handlePointerCancel, { passive: true });
}
