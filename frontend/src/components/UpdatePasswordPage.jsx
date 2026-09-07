import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import ChurnNetwork3D from './ChurnNetwork3D.jsx';
import { supabase } from '../utils/supabase.js';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [recoveryVerified, setRecoveryVerified] = useState(false);

  // 3D Tilt and Glare Physics
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 40, borderAngle: 135 });
  const cardContainerRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0, hasMoved: false });
  const animFrameRef = useRef(null);
  const currentPhysicsRef = useRef({ rotX: 0, rotY: 0, glareX: 50, glareY: 40 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Listen for Supabase PASSWORD_RECOVERY auth event
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryVerified(true);
        showToast('Recovery token validated. Please set your new password.', 'success');
      }
    });

    // Also check current session in case hash was already parsed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRecoveryVerified(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3D Parallax & Glare Physics Loop
  useEffect(() => {
    const handleMouseMove = (e) => {
      const card = cardContainerRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const normX = Math.max(-1, Math.min(1, (x / rect.width) * 2 - 1));
      const normY = Math.max(-1, Math.min(1, (y / rect.height) * 2 - 1));

      mousePosRef.current = {
        x: normX,
        y: normY,
        glareX: (x / rect.width) * 100,
        glareY: (y / rect.height) * 100,
        hasMoved: true,
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current = { x: 0, y: 0, glareX: 50, glareY: 40, hasMoved: false };
    };

    window.addEventListener('mousemove', handleMouseMove);
    const cardEl = cardContainerRef.current;
    if (cardEl) {
      cardEl.addEventListener('mouseleave', handleMouseLeave);
    }

    const DAMPING = 0.088;
    const MAX_TILT_X = 10;
    const MAX_TILT_Y = 12;

    const animateLoop = () => {
      const targetRotX = -mousePosRef.current.y * MAX_TILT_X;
      const targetRotY = mousePosRef.current.x * MAX_TILT_Y;
      const targetGlareX = mousePosRef.current.hasMoved ? mousePosRef.current.glareX : 50;
      const targetGlareY = mousePosRef.current.hasMoved ? mousePosRef.current.glareY : 40;

      const curr = currentPhysicsRef.current;
      curr.rotX += (targetRotX - curr.rotX) * DAMPING;
      curr.rotY += (targetRotY - curr.rotY) * DAMPING;
      curr.glareX += (targetGlareX - curr.glareX) * DAMPING;
      curr.glareY += (targetGlareY - curr.glareY) * DAMPING;

      const angleRad = Math.atan2(curr.rotX, curr.rotY);
      let angleDeg = (angleRad * 180) / Math.PI + 90;
      if (angleDeg < 0) angleDeg += 360;

      setTilt({
        rotX: parseFloat(curr.rotX.toFixed(2)),
        rotY: parseFloat(curr.rotY.toFixed(2)),
        glareX: parseFloat(curr.glareX.toFixed(1)),
        glareY: parseFloat(curr.glareY.toFixed(1)),
        borderAngle: parseFloat(angleDeg.toFixed(1)),
      });

      animFrameRef.current = requestAnimationFrame(animateLoop);
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cardEl) cardEl.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Validation
  const validate = () => {
    const errs = {};
    if (!password) {
      errs.password = 'New password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit new password to Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      triggerShake();
      showToast('Please correct the errors in the form.', 'error');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      showToast('Password updated successfully! Redirecting to login...', 'success');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Update password error:', err);
      triggerShake();
      showToast(err.message || 'Failed to update password. Please try again.', 'error');
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#08090b] flex items-center justify-center overflow-hidden font-sans select-none antialiased">
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ChurnNetwork3D />
      </div>

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08090b] via-transparent to-[#08090b]/80 pointer-events-none z-0" />

      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed top-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-none border text-xs font-mono font-medium shadow-2xl transition-all duration-300 animate-slide-in ${
            toast.type === 'error'
              ? 'bg-neutral-950 border-white text-white shadow-white/10'
              : 'bg-neutral-950 border-neutral-700 text-white shadow-black/40'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Glass Panel Card */}
      <div
        ref={cardContainerRef}
        className={`relative z-10 w-full max-w-md p-4 transition-transform duration-75 ease-out ${
          isShaking ? 'animate-shake' : ''
        }`}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) translateZ(10px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="hud-card-outer p-[1px] shadow-2xl"
          style={{
            background: `linear-gradient(${tilt.borderAngle}deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)`,
          }}
        >
          <div className="hud-card-inner p-8 relative overflow-hidden bg-[#0d0e12]/95 backdrop-blur-xl">
            {/* Dynamic Specular Glare */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(400px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.08) 0%, transparent 80%)`,
              }}
            />

            {/* Header Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-white flex items-center justify-center text-neutral-950 shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold tracking-widest text-white uppercase block">
                    CHURNGUARD AI
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    SECURE CREDENTIAL RECOVERY
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 px-2 py-0.5 border border-neutral-800 bg-neutral-950 text-[10px] font-mono text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>SSL:ENCRYPTED</span>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-white tracking-tight">Set New Password</h1>
              <p className="text-xs text-neutral-400 mt-1">
                Enter and confirm your new password to restore account access.
              </p>
            </div>

            {errors.general && (
              <div className="mb-4 p-3 bg-neutral-950 border border-white/40 text-xs text-neutral-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Password Update Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* New Password Input */}
              <div className="space-y-1.5 input-hud-field">
                <label className="block text-xs font-medium text-neutral-200">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="input-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading || isSuccess}
                    className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-9 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                      errors.password
                        ? 'border-white focus:ring-1 focus:ring-white/40'
                        : 'border-neutral-800 focus:border-white'
                    }`}
                  />
                  <button
                    type="button"
                    data-bloom="subtle"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-300 hover:text-white transition-colors cursor-pointer p-0.5 rounded-sm"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-neutral-200 mt-1 font-medium">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5 input-hud-field">
                <label className="block text-xs font-medium text-neutral-200">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="input-confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading || isSuccess}
                    className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-9 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                      errors.confirmPassword
                        ? 'border-white focus:ring-1 focus:ring-white/40'
                        : 'border-neutral-800 focus:border-white'
                    }`}
                  />
                  <button
                    type="button"
                    data-bloom="subtle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-neutral-300 hover:text-white transition-colors cursor-pointer p-0.5 rounded-sm"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-neutral-200 mt-1 font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-update-password"
                type="submit"
                data-bloom="primary"
                disabled={isLoading || isSuccess}
                className="btn-clip-corner w-full py-2.5 px-4 font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-950 flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer disabled:opacity-50 mt-6 shadow-lg hover:shadow-white/10"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                    <span>Password Updated!</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Back to Login */}
              <div className="pt-4 text-center">
                <Link
                  to="/login"
                  data-bloom="subtle"
                  className="text-xs text-neutral-400 hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
                >
                  Return to Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
