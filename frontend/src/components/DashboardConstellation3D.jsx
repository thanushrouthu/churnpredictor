import React, { useRef, useEffect, useState } from 'react';

/**
 * DashboardConstellation3D
 * Subtle, low-opacity monochrome particle constellation field with faint dynamic connecting lines.
 * Provides a distinct "live enterprise data stream" ambiance without competing with dashboard content.
 * Automatically respects prefers-reduced-motion and pauses when the tab is hidden.
 */
export default function DashboardConstellation3D() {
  const canvasRef = useRef(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);
    const motionListener = (e) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);

    if (motionQuery.matches) {
      return () => motionQuery.removeEventListener('change', motionListener);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Track mouse for subtle proximity attraction
    const mouse = { x: -1000, y: -1000, active: false };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Particle nodes configuration with clearly visible constellation network
    const isMobile = window.innerWidth < 768;
    const nodeCount = isMobile ? 45 : 85;
    const maxConnectionDistance = isMobile ? 110 : 150;
    let nodes = [];

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        const depth = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
        const speedScale = 0.25 + depth * 0.35;
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedScale,
          vy: (Math.random() - 0.5) * speedScale,
          depth,
          radius: (Math.random() * 1.5 + 1.0) * (0.7 + depth * 0.5),
          baseAlpha: Math.random() * 0.3 + 0.35, // 0.35 to 0.65 (clearly visible)
          pulseSpeed: Math.random() * 0.02 + 0.008,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    initNodes();

    let frame = 0;

    const render = () => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      frame++;
      ctx.clearRect(0, 0, width, height);

      // 1. Update and draw particles
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Gentle drift scaled by depth parallax
        node.x += node.vx;
        node.y += node.vy;

        // Screen boundary wrap
        if (node.x < -15) node.x = width + 15;
        if (node.x > width + 15) node.x = -15;
        if (node.y < -15) node.y = height + 15;
        if (node.y > height + 15) node.y = -15;

        // Mouse gentle attraction
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150 && dist > 0) {
            const force = ((150 - dist) / 150) * node.depth;
            node.x -= (dx / dist) * force * 0.7;
            node.y -= (dy / dist) * force * 0.7;
          }
        }

        // Dynamic pulsing opacity
        const currentAlpha =
          node.baseAlpha + Math.sin(frame * node.pulseSpeed + node.pulseOffset) * 0.15;
        const clampedAlpha = Math.max(0.2, Math.min(0.8, currentAlpha));

        // Draw particle dot with soft aura
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${clampedAlpha})`;
        ctx.fill();

        // Connect proximity lines
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDistance) {
            const lineAlpha = (1 - dist / maxConnectionDistance) * 0.22 * ((node.depth + other.depth) / 2);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      motionQuery.removeEventListener('change', motionListener);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (isReducedMotion) {
    return (
      <div
        data-testid="reduced-motion-constellation"
        className="fixed inset-0 pointer-events-none select-none z-0 bg-neutral-950 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1.5px,transparent_1.5px)] [background-size:36px_36px] opacity-40" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
      <canvas
        id="dashboard-constellation-canvas"
        ref={canvasRef}
        className="w-full h-full block"
        style={{ pointerEvents: 'none' }}
      />
      {/* Subtle ambient light gradient that preserves background visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950/40 pointer-events-none" />
    </div>
  );
}
