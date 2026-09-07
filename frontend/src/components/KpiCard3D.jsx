import React, { useRef, useState, useEffect } from 'react';
import CountUp from './CountUp.jsx';

/**
 * KpiCard3D
 * Executive KPI summary card with chamfered cut corners, subtle 3D mouse tilt physics,
 * moving specular highlight, and smooth hover elevation.
 */
export default function KpiCard3D({
  title,
  value,
  subtext,
  icon: Icon,
  trend = null, // { type: 'up' | 'down' | 'neutral', text: string }
  badge = null,
  decimals = 0,
  prefix = '',
  suffix = '',
  index = 0,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 50, isHovered: false });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);
    const motionListener = (e) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);
    return () => motionQuery.removeEventListener('change', motionListener);
  }, []);

  const handleMouseMove = (e) => {
    if (isReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1

    // Gentle tilt range (max ±3.5deg for refined dashboard scale)
    const rotX = -(y - 0.5) * 6.5;
    const rotY = (x - 0.5) * 6.5;

    setTilt({
      rotX,
      rotY,
      glareX: x * 100,
      glareY: y * 100,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotX: 0, rotY: 0, glareX: 50, glareY: 50, isHovered: false });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`kpi-card-scene relative group cursor-default transition-all duration-300 animate-fade-up-${Math.min(
        index + 1,
        4
      )}`}
      style={{ perspective: '900px' }}
    >
      {/* 3D Tilted Card Body with Angular Cut-Corner Shell */}
      <div
        className="hud-card-outer shadow-layer-kpi w-full p-[1px] relative transition-transform duration-150 ease-out group-hover:-translate-y-1"
        style={
          !isReducedMotion && tilt.isHovered
            ? {
                transform: `rotateX(${tilt.rotX.toFixed(2)}deg) rotateY(${tilt.rotY.toFixed(2)}deg)`,
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)',
              }
            : {
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.06) 100%)',
              }
        }
      >
        {/* Inner Chamfered Glass Panel */}
        <div className="hud-card-inner w-full p-5 relative overflow-hidden bg-neutral-900/90 backdrop-blur-xl">
          {/* Subtle Specular Glare on Hover */}
          {!isReducedMotion && tilt.isHovered && (
            <div
              className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle 220px at ${tilt.glareX.toFixed(
                  1
                )}% ${tilt.glareY.toFixed(
                  1
                )}%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 80%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Content Header: Title & Icon */}
          <div className="flex items-center justify-between mb-2 relative z-20">
            <span className="text-xs font-medium text-neutral-400">
              {title}
            </span>
            {Icon && (
              <div className="w-6 h-6 bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Value Display with Animated CountUp and Tabular Numerals */}
          <div className="flex items-baseline space-x-2 relative z-20">
            <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight tabular-nums font-mono">
              {typeof value === 'number' ? (
                <CountUp
                  end={value}
                  decimals={decimals}
                  prefix={prefix}
                  suffix={suffix}
                  duration={800}
                  className="tabular-nums font-mono"
                />
              ) : (
                value
              )}
            </div>
          </div>

          {/* Subtext & Trend Line with Gentle Micro-Bounce */}
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400 relative z-20">
            <span className="truncate">{subtext}</span>
            {trend && (
              <span
                className={`text-xs font-medium flex items-center space-x-1 ${
                  trend.type === 'up'
                    ? 'text-zinc-200'
                    : trend.type === 'down'
                    ? 'text-zinc-300'
                    : 'text-zinc-400'
                }`}
              >
                <span className="animate-trend-bounce inline-block">{trend.text}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
