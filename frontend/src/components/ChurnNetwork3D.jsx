import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 1. 3D Flowing Monochrome Data-Stream Wave Ribbons (Brightened 20-30%)
// ---------------------------------------------------------------------------
function MonochromeWaveMesh({ reducedMotion = false }) {
  const meshRef = useRef();
  const secondaryMeshRef = useRef();
  const gridRef = useRef();

  // Plane resolution: capped for 60fps performance
  const cols = 55;
  const rows = 35;

  // Primary Wave Geometry (Bright White Wireframe Data Stream)
  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(cols * rows * 3);
    const init = new Float32Array(cols * rows * 3);
    let idx = 0;
    const width = 18;
    const depth = 12;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * width;
        const z = (r / (rows - 1) - 0.5) * depth;
        const y = 0;

        pos[idx] = x;
        pos[idx + 1] = y;
        pos[idx + 2] = z;

        init[idx] = x;
        init[idx + 1] = y;
        init[idx + 2] = z;

        idx += 3;
      }
    }
    return [pos, init];
  }, []);

  // Line index buffer for wireframe ribbons
  const indices = useMemo(() => {
    const ind = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const i1 = r * cols + c;
        const i2 = r * cols + (c + 1);
        ind.push(i1, i2);
      }
    }
    for (let c = 0; c < cols; c += 2) {
      for (let r = 0; r < rows - 1; r++) {
        const i1 = r * cols + c;
        const i2 = (r + 1) * cols + c;
        ind.push(i1, i2);
      }
    }
    return new Uint16Array(ind);
  }, []);

  // Frame animation loop for undulating wave surface & subtle monochrome glitch
  useFrame((state) => {
    if (reducedMotion) return;

    const time = state.clock.getElapsedTime();
    const pos = meshRef.current?.geometry.attributes.position.array;
    const secPos = secondaryMeshRef.current?.geometry.attributes.position.array;

    // Periodic micro-glitch pulse every ~5 seconds (lasting 100ms)
    const isGlitch = (time % 5) > 4.9;
    const glitchIntensity = isGlitch ? 0.25 : 0;

    if (pos) {
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = initialPositions[idx];
          const z = initialPositions[idx + 2];

          // Complex wave: sum of harmonic sine/cosine waves traveling across space
          const wave1 = Math.sin(x * 0.4 + time * 1.2) * 0.7;
          const wave2 = Math.cos(z * 0.6 + time * 0.95) * 0.5;
          const wave3 = Math.sin((x + z) * 0.3 + time * 0.7) * 0.35;
          const jitter = isGlitch ? (Math.random() - 0.5) * glitchIntensity : 0;

          pos[idx + 1] = wave1 + wave2 + wave3 + jitter;
          idx += 3;
        }
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Secondary harmonic wave ribbon for visual depth
    if (secPos) {
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = initialPositions[idx];
          const z = initialPositions[idx + 2];

          const sWave = Math.sin(x * 0.45 - time * 1.4) * 0.75 + Math.cos(z * 0.45 - time * 1.0) * 0.4;
          secPos[idx + 1] = sWave - 0.35;
          idx += 3;
        }
      }
      secondaryMeshRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Perspective floor grid animation
    if (gridRef.current) {
      gridRef.current.position.z = (time * 0.7) % 2;
    }
  });

  return (
    <group position={[0, -0.7, -1.0]} rotation={[0.42, 0, 0]}>
      {/* 1. Primary Flowing Wave Mesh (Brightened ~25% for high visibility) */}
      <lineSegments ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="index"
            count={indices.length}
            array={indices}
            itemSize={1}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 2. Secondary Harmonic Wave (Brightened ~25% for crisp contrast) */}
      <lineSegments ref={secondaryMeshRef} position={[0, -0.12, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={new Float32Array(positions)}
            itemSize={3}
          />
          <bufferAttribute
            attach="index"
            count={indices.length}
            array={indices}
            itemSize={1}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#e5e5e5"
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 3. Perspective Grid Floor (Pronounced and brightened ~30%) */}
      <group ref={gridRef} position={[0, -1.8, 0]}>
        <gridHelper
          args={[28, 28, '#737373', '#404040']}
          rotation={[0, 0, 0]}
        />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 2. Scene Orchestrator with Mouse Parallax
// ---------------------------------------------------------------------------
function MonochromeSceneOrchestrator({ reducedMotion = false }) {
  const rootGroupRef = useRef();

  useFrame((state) => {
    if (reducedMotion) return;

    const targetX = state.pointer.x * 0.3;
    const targetY = state.pointer.y * 0.2;

    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(rootGroupRef.current.rotation.y, targetX, 0.04);
      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(rootGroupRef.current.rotation.x, -targetY, 0.04);
    }
  });

  return (
    <group ref={rootGroupRef}>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 8, 5]} intensity={2.0} color="#ffffff" />
      <pointLight position={[-6, -4, 2]} intensity={1.2} color="#a3a3a3" />
      <MonochromeWaveMesh reducedMotion={reducedMotion} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 3. Subtle Monochrome Background Character Stream (Canvas 2D)
// ---------------------------------------------------------------------------
function MonochromeMatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let logicalWidth = canvas.parentElement?.clientWidth || window.innerWidth;
    let logicalHeight = canvas.parentElement?.clientHeight || window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      logicalWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      logicalHeight = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '0123456789ABCDEF'.split('');
    const fontSize = 13;
    const columns = Math.max(1, Math.floor(logicalWidth / (fontSize * 2.5)));
    const drops = Array.from({ length: columns }, () => Math.random() * -60);

    let lastTime = 0;
    const fps = 24;
    const interval = 1000 / fps;

    const draw = (currentTime) => {
      animationFrameId = requestAnimationFrame(draw);
      if (document.hidden) return;

      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      // Faint dark trail
      ctx.fillStyle = 'rgba(9, 10, 15, 0.14)';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'; // Crisp low-opacity white glyphs
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * (fontSize * 2.5);
        const y = drops[i] * fontSize;

        if (Math.random() < 0.08) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(char, x, y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        } else {
          ctx.fillText(char, x, y);
        }

        if (y > logicalHeight && Math.random() > 0.985) {
          drops[i] = 0;
        }
        drops[i] += 0.75;
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-40 z-0"
    />
  );
}

// ---------------------------------------------------------------------------
// 4. Main Exported Full-Screen Background Component
// ---------------------------------------------------------------------------
export default function ChurnNetwork3D() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const motionListener = (e) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);

    const checkViewport = () => setIsMobile(window.innerWidth < 768);
    checkViewport();
    window.addEventListener('resize', checkViewport);

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    return () => {
      motionQuery.removeEventListener('change', motionListener);
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  // Fallback for reduced motion or missing WebGL: Pure static monochrome gradient
  if (reducedMotion || !hasWebGL) {
    return (
      <div
        data-testid="reduced-motion-fallback"
        className="w-full h-full absolute inset-0 overflow-hidden bg-gradient-to-b from-neutral-950 via-[#0d0f14] to-neutral-950 select-none"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0 bg-neutral-950 overflow-hidden select-none animate-cyber-glitch">
      {/* 1. Subtle Sparse Monochrome Matrix Rain in Far Background */}
      {!isMobile && <MonochromeMatrixRain />}

      {/* 2. Three.js Flowing Monochrome Wave Ribbons Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 2.0, 7.0], fov: 50 }}
          dpr={isMobile ? 1 : [1, 2.5]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <MonochromeSceneOrchestrator reducedMotion={reducedMotion} />
        </Canvas>
      </div>

      {/* 3. Faint Monochrome Scanning-Line Sweep Animation Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div className="w-full h-24 bg-gradient-to-b from-transparent via-white/8 to-transparent animate-cyber-scan" />
      </div>

      {/* 4. Radial Vignette and Deep Dark Overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/70 z-10" />
      <div className="absolute inset-0 pointer-events-none bg-radial-at-c from-transparent via-neutral-950/30 to-neutral-950 z-10" />
    </div>
  );
}
