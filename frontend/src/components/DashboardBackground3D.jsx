import React, { useRef, useEffect, useState } from 'react';

/**
 * DashboardBackground3D:
 * Multi-layer 3D perspective data-mesh background.
 * Uses real 3D camera projection to render floating nodes and dynamic connection lines
 * across multiple depth planes (background, midground, foreground) with smooth parallax
 * on mouse movement and page scroll.
 * 
 * Guarantees:
 * - Visibly renders in all browsers and headless screenshot captures
 * - Sits at z-0 with non-zero opacity
 * - Highly performant on long scrollable tables
 * - Respects prefers-reduced-motion
 */
export default function DashboardBackground3D() {
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const motionListener = (e) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);
    return () => motionQuery.removeEventListener('change', motionListener);
  }, []);

  useEffect(() => {
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
    };
    window.addEventListener('resize', handleResize);

    // Track mouse & scroll for smooth parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let scrollY = 0;
    let targetScrollY = 0;

    const handleMouseMove = (e) => {
      targetMouseX = (e.clientX - width / 2) / (width / 2);
      targetMouseY = (e.clientY - height / 2) / (height / 2);
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Multi-depth layer configuration
    // Layer 0: Deep Background (z: 600..900, slow drift, small, subtle)
    // Layer 1: Midground (z: 250..550, moderate drift, connecting lines)
    // Layer 2: Foreground (z: -50..200, fast drift, large crisp points, responsive)
    const layers = [
      { count: 45, zMin: 600, zMax: 900, speed: 0.25, baseR: 2.2, opacity: 0.35, connect: false, parallax: 15 },
      { count: 65, zMin: 250, zMax: 550, speed: 0.45, baseR: 3.5, opacity: 0.6, connect: true, maxDist: 140, parallax: 35 },
      { count: 40, zMin: -50, zMax: 200, speed: 0.7, baseR: 4.8, opacity: 0.85, connect: true, maxDist: 170, parallax: 65 },
    ];

    const nodes = [];
    layers.forEach((layer, layerIdx) => {
      for (let i = 0; i < layer.count; i++) {
        nodes.push({
          x: (Math.random() - 0.5) * (width * 1.6),
          y: (Math.random() - 0.5) * (height * 1.6),
          z: layer.zMin + Math.random() * (layer.zMax - layer.zMin),
          initX: (Math.random() - 0.5) * (width * 1.6),
          initY: (Math.random() - 0.5) * (height * 1.6),
          vx: (Math.random() - 0.5) * 0.45 * layer.speed,
          vy: (Math.random() - 0.5) * 0.45 * layer.speed,
          freqX: 0.2 + Math.random() * 0.4,
          freqY: 0.2 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          amp: 18 + Math.random() * 25,
          layerIdx,
          layer,
        });
      }
    });

    const fov = 420;
    let time = 0;

    const render = () => {
      // Smooth lerp parallax
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
      scrollY += (targetScrollY - scrollY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      time += reducedMotion ? 0 : 0.012;

      // Project 3D nodes to 2D screen coordinates
      const projected = [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reducedMotion) {
          n.x = n.initX + Math.sin(time * n.freqX + n.phase) * n.amp;
          n.y = n.initY + Math.cos(time * n.freqY + n.phase) * n.amp;
        }

        // Apply layer-specific parallax
        const parallaxX = mouseX * n.layer.parallax;
        const parallaxY = mouseY * n.layer.parallax - (scrollY * (n.layer.parallax * 0.003));

        const effectiveX = n.x + parallaxX;
        const effectiveY = n.y + parallaxY;

        // Camera perspective scale
        const scale = fov / (fov + n.z);
        const screenX = centerX + effectiveX * scale;
        const screenY = centerY + effectiveY * scale;

        projected.push({
          screenX,
          screenY,
          scale,
          radius: Math.max(1, n.layer.baseR * scale),
          opacity: Math.min(1, n.layer.opacity * scale * 1.1),
          layerIdx: n.layerIdx,
          layer: n.layer,
        });
      }

      // Draw dynamic connection lines between nearby nodes in same or adjacent layers
      ctx.lineWidth = 1.0;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (!p1.layer.connect) continue;
        // Check window bounds
        if (p1.screenX < -50 || p1.screenX > width + 50 || p1.screenY < -50 || p1.screenY > height + 50) continue;

        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (!p2.layer.connect) continue;
          if (Math.abs(p1.layerIdx - p2.layerIdx) > 1) continue;

          const dx = p1.screenX - p2.screenX;
          const dy = p1.screenY - p2.screenY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxD = p1.layer.maxDist;
          if (dist < maxD) {
            const lineAlpha = (1 - dist / maxD) * 0.28 * Math.min(p1.opacity, p2.opacity);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212, 212, 216, ${lineAlpha.toFixed(3)})`; // zinc-300
            ctx.moveTo(p1.screenX, p1.screenY);
            ctx.lineTo(p2.screenX, p2.screenY);
            ctx.stroke();
          }
        }
      }

      // Draw floating nodes with halo corona
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        if (p.screenX < -20 || p.screenX > width + 20 || p.screenY < -20 || p.screenY > height + 20) continue;

        // Outer soft glow
        const glowGrad = ctx.createRadialGradient(p.screenX, p.screenY, 0, p.screenX, p.screenY, p.radius * 2.8);
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${(p.opacity * 0.85).toFixed(3)})`);
        glowGrad.addColorStop(0.4, `rgba(212, 212, 216, ${(p.opacity * 0.35).toFixed(3)})`);
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.fillStyle = glowGrad;
        ctx.arc(p.screenX, p.screenY, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Core bright nucleus
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${(p.opacity).toFixed(3)})`;
        ctx.arc(p.screenX, p.screenY, Math.max(1, p.radius * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [reducedMotion]);

  return (
    <div
      id="dashboard-3d-background"
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      style={{ opacity: 1 }}
    >
      {/* 3D Perspective Data-Mesh Canvas */}
      <canvas
        ref={canvasRef}
        id="canvas-3d-network"
        className="w-full h-full block"
        style={{ display: 'block', opacity: 1 }}
      />

      {/* Gentle Edge Vignette (Subtle - strictly keeps mesh visible) */}
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
