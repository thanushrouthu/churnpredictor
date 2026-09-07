import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
  X,
  Zap,
} from 'lucide-react';
import ChurnNetwork3D from './ChurnNetwork3D.jsx';
import { supabase } from '../utils/supabase.js';
import { API_BASE_URL } from '../utils/api.js';

// Official Google 4-Color Brand Icon
function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthPage({ onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [googleConfigModalOpen, setGoogleConfigModalOpen] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const googleBtnContainerRef = useRef(null);

  // Read Google Client ID from environment or local override
  const configuredClientId =
    (typeof window !== 'undefined' && localStorage.getItem('GOOGLE_CLIENT_ID_OVERRIDE')) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    '';

  const isClientIdConfigured = Boolean(
    configuredClientId &&
    configuredClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE' &&
    configuredClientId.trim().length > 10 &&
    configuredClientId.includes('.apps.googleusercontent.com')
  );

  // 3D Tilt, Glare, Entrance and Flip State
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, glareX: 50, glareY: 40, borderAngle: 135 });
  const [flipClass, setFlipClass] = useState('');
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const cardContainerRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0, hasMoved: false });
  const animFrameRef = useRef(null);
  const currentPhysicsRef = useRef({ rotX: 0, rotY: 0, glareX: 50, glareY: 40 });

  // Initialize Google Identity Services when a valid Google Client ID is available
  useEffect(() => {
    if (!isClientIdConfigured || !configuredClientId) return;

    let mounted = true;

    const initGsi = () => {
      if (!window.google?.accounts?.id || !mounted) return;

      try {
        window.google.accounts.id.initialize({
          client_id: configuredClientId.trim(),
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            width: 326,
            logo_alignment: 'left',
          });
        }
      } catch (err) {
        console.error('Google Identity Services initialization error:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGsi();
          clearInterval(timer);
        }
      }, 100);
      return () => {
        mounted = false;
        clearInterval(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [isClientIdConfigured, configuredClientId, mode]);

  // 3D Mouse Parallax & Idle Oscillation Loop
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);
    const motionListener = (e) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionListener);

    if (motionQuery.matches) {
      return () => motionQuery.removeEventListener('change', motionListener);
    }

    const handleMouseMove = (e) => {
      mousePosRef.current.hasMoved = true;
      const card = cardContainerRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      // Normalized coordinates relative to card center across viewport
      const dx = (e.clientX - cardCenterX) / (window.innerWidth * 0.5);
      const dy = (e.clientY - cardCenterY) / (window.innerHeight * 0.5);

      mousePosRef.current.x = Math.max(-1.15, Math.min(1.15, dx));
      mousePosRef.current.y = Math.max(-1.15, Math.min(1.15, dy));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const startTime = performance.now();

    const loop = (now) => {
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const elapsed = (now - startTime) / 1000;
      const { x, y } = mousePosRef.current;

      // Continuous subtle idle oscillation
      const idleOscX = Math.sin(elapsed * 1.6) * 2.6;
      const idleOscY = Math.cos(elapsed * 1.3) * 3.2;
      const idleGlareX = Math.cos(elapsed * 0.95) * 22;
      const idleGlareY = Math.sin(elapsed * 0.95) * 18;

      // Expanded 3D rotation targets (~12° X, ~14.5° Y)
      const targetRotX = -y * 12.0 + idleOscX;
      const targetRotY = x * 14.5 + idleOscY;

      // Dynamic specular glare position tracking light source opposite to tilt
      const targetGlareX = 50 + (x * 48) + idleGlareX;
      const targetGlareY = 45 + (y * 42) + idleGlareY;

      // Dynamic edge light reflection angle
      const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;

      // Smooth lerp damping for natural physical mass
      const cur = currentPhysicsRef.current;
      cur.rotX += (targetRotX - cur.rotX) * 0.088;
      cur.rotY += (targetRotY - cur.rotY) * 0.088;
      cur.glareX += (targetGlareX - cur.glareX) * 0.088;
      cur.glareY += (targetGlareY - cur.glareY) * 0.088;

      setTilt({
        rotX: cur.rotX,
        rotY: cur.rotY,
        glareX: cur.glareX,
        glareY: cur.glareY,
        borderAngle: Math.round(angle),
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      motionQuery.removeEventListener('change', motionListener);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    if (mode === 'signup' && (!name.trim() || name.trim().length < 2)) {
      newErrors.name = 'Please enter your full name (at least 2 characters).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      showToast('No ID token credential received from Google.', 'error');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Send real ID token JWT received from Google to backend for cryptographic verification
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Google server token verification failed.');
      }

      setIsSuccess(true);
      showToast(`Welcome ${data.name || data.email}! Authenticated with Google.`, 'success');

      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess(data);
        }
      }, 700);
    } catch (err) {
      triggerShake();
      showToast(err.message, 'error');
      setErrors((prev) => ({ ...prev, general: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomGoogleButtonClick = () => {
    if (!isClientIdConfigured) {
      // Zero fake login: Open configuration dialog explaining exact requirements
      setGoogleConfigModalOpen(true);
      return;
    }

    // When Client ID is configured, trigger Google Identity prompt / account chooser
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          showToast('Please click the official Google button directly to choose your account.', 'error');
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      triggerShake();
      showToast('Please correct the highlighted errors.', 'error');
      return;
    }

    setIsLoading(true);
    setErrors({});

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
    const payload =
      mode === 'login'
        ? { email: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check your credentials.');
      }

      setIsSuccess(true);
      showToast(mode === 'login' ? 'Welcome back! Redirecting...' : 'Account created successfully!', 'success');

      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess(data);
        }
      }, 700);
    } catch (err) {
      triggerShake();
      showToast(err.message, 'error');
      setErrors((prev) => ({ ...prev, general: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendForgot = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      showToast('Please enter a valid work email address.', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/update-password`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      showToast('Password recovery instructions sent to your email.', 'success');
      setForgotModalOpen(false);
      setForgotEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      showToast(err.message || 'Failed to send recovery instructions.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setErrors({});
    setIsSuccess(false);

    if (!isReducedMotion) {
      const dir = newMode === 'signup' ? '9deg' : '-9deg';
      if (cardContainerRef.current) {
        cardContainerRef.current.style.setProperty('--flip-direction', dir);
      }
      setFlipClass('card-flip-enter');
      setTimeout(() => setFlipClass(''), 450);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* FULL-SCREEN BACKGROUND: Monochrome Cyber Data-Stream Wave Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ChurnNetwork3D />
      </div>

      {/* Toast Notification (Monochrome) */}
      {toast && (
        <div
          id="auth-toast"
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-none flex items-center space-x-3 shadow-2xl transition-all transform duration-300 text-xs ${
            toast.type === 'error'
              ? 'bg-neutral-900 text-white border border-neutral-700 shadow-neutral-950/80'
              : 'bg-white text-neutral-950 font-semibold border border-neutral-200 shadow-neutral-950/50'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-neutral-300" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-neutral-950" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 3D SCENE PERSPECTIVE WRAPPER */}
      <div
        ref={cardContainerRef}
        className="card-3d-scene relative z-10 w-full max-w-[400px] my-auto flex flex-col items-center"
      >
        {/* PHYSICAL 3D FLOATING CARD WITH DYNAMIC SHADOW AND EDGE LIGHTING */}
        <div
          id="auth-card"
          className={`card-3d-body hud-card-outer animate-card-entrance w-full p-[1px] relative ${flipClass} ${
            isShaking ? 'animate-shake' : ''
          }`}
          style={
            !isReducedMotion
              ? {
                  transform: `rotateX(${tilt.rotX.toFixed(2)}deg) rotateY(${tilt.rotY.toFixed(2)}deg) translateZ(12px)`,
                  boxShadow: `${(-tilt.rotY * 4.8).toFixed(1)}px ${(tilt.rotX * 4.8 + 38).toFixed(1)}px 85px -10px rgba(0, 0, 0, 0.96), 0 40px 100px -20px rgba(0, 0, 0, 0.9)`,
                  background: `linear-gradient(${tilt.borderAngle}deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.14) 40%, rgba(255, 255, 255, 0.06) 100%)`,
                }
              : {}
          }
        >
          {/* Angular Chamfered Inner Card Panel */}
          <div className="hud-card-inner w-full p-7 sm:p-8 relative overflow-hidden">
            {/* Ambient Optical Light Drift inside Glass Card (purely visual overlay) */}
            <div
              className="absolute -inset-16 pointer-events-none select-none overflow-hidden z-0"
              aria-hidden="true"
            >
              <div className="w-80 h-80 rounded-full bg-radial from-white/[0.08] via-white/[0.02] to-transparent blur-3xl animate-ambient-drift absolute top-1/4 left-1/4 pointer-events-none" />
            </div>

            {/* Dynamic Moving Specular Highlight / Glare (purely visual overlay, tracks cursor opposite to tilt) */}
            {!isReducedMotion && (
              <div
                className="absolute inset-0 pointer-events-none select-none z-10 transition-opacity duration-300"
                aria-hidden="true"
                style={{
                  background: `radial-gradient(circle 440px at ${tilt.glareX.toFixed(1)}% ${tilt.glareY.toFixed(1)}%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 42%, transparent 75%)`,
                  mixBlendMode: 'screen',
                }}
              />
            )}

            {/* INTERACTIVE CONTENT CONTAINER (z-20: clearly above all decorative overlays) */}
            <div className="relative z-20">
              {/* Layer 1: Brand Header */}
              <div className="flex items-center space-x-3 mb-6 animate-fade-up-1">
                <div className="w-9 h-9 bg-white flex items-center justify-center rounded-none shadow-md shadow-black/40 flex-shrink-0">
                  <Zap className="w-5 h-5 text-neutral-950 fill-neutral-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                      ChurnGuard AI
                    </h1>
                    <span className="inline-flex items-center space-x-1.5 font-mono text-[9px] tracking-wider px-2 py-0.5 bg-neutral-900 border border-neutral-600 text-neutral-200 select-none animate-status-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot" />
                      <span>SYS:ONLINE</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 truncate mt-0.5">
                    Enterprise Churn Intelligence & Risk Platform
                  </p>
                </div>
              </div>

              {/* Layer 2: Segmented Mode Switcher with Sliding Active Indicator & Glow */}
              <div className="relative flex border border-neutral-800 bg-neutral-950 mb-5 p-0 rounded-none shadow-md shadow-black/50 overflow-hidden animate-fade-up-2">
                {/* Animated sliding active block */}
                <div
                  className={`absolute top-0 bottom-0 w-1/2 bg-white transition-transform duration-300 ease-out pointer-events-none ${
                    mode === 'login' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                />
                {/* Animated sliding underline / glow under the active tab */}
                <div
                  className={`absolute bottom-0 h-[2px] w-1/2 bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.7)] transition-transform duration-300 ease-out pointer-events-none z-20 ${
                    mode === 'login' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                />

                <button
                  id="tab-login"
                  type="button"
                  data-bloom="secondary"
                  onClick={() => switchMode('login')}
                  className={`relative z-10 flex-1 py-2 text-xs transition-colors duration-200 rounded-none border-r border-neutral-800/60 cursor-pointer ${
                    mode === 'login'
                      ? 'text-neutral-950 font-semibold'
                      : 'text-neutral-300 hover:text-white font-medium'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="tab-signup"
                  type="button"
                  data-bloom="secondary"
                  onClick={() => switchMode('signup')}
                  className={`relative z-10 flex-1 py-2 text-xs transition-colors duration-200 rounded-none cursor-pointer ${
                    mode === 'signup'
                      ? 'text-neutral-950 font-semibold'
                      : 'text-neutral-300 hover:text-white font-medium'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Layer 3: Form Header Title */}
              <div className="mb-4 animate-fade-up-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
                </h2>
                <p className="text-xs text-neutral-300 mt-1">
                  {mode === 'login'
                    ? 'Enter your credentials to access the ML churn dashboard.'
                    : 'Get started with staff-level ML analytics and SHAP explainability.'}
                </p>
              </div>

              {/* Layer 3.5: Google OAuth Integration */}
              <div className="mb-4 animate-fade-up-3">
                {isClientIdConfigured ? (
                  <div className="w-full flex justify-center py-0.5">
                    {/* Official Google Identity Services Rendered Button: Directly triggers Google's real OAuth Account Picker */}
                    <div
                      id="google-signin-official-btn"
                      ref={googleBtnContainerRef}
                      className="w-full flex justify-center overflow-hidden rounded-sm"
                      style={{ minHeight: '44px' }}
                    />
                  </div>
                ) : (
                  <button
                    id="btn-google-auth"
                    type="button"
                    data-bloom="primary"
                    disabled={isLoading || isSuccess}
                    onClick={handleCustomGoogleButtonClick}
                    className="btn-google btn-clip-corner w-full py-2.5 px-4 font-semibold text-xs flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50 select-none"
                    title="Click to configure Google OAuth Client ID"
                  >
                    <GoogleIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Continue with Google</span>
                  </button>
                )}

                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-full border-t border-neutral-800" />
                  <span className="bg-[#0d0e12] px-3 text-[10px] font-mono tracking-wider text-neutral-400 uppercase select-none absolute">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Layer 4 & 5: Form Elements with Interactive Lift & Glow */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4"
              >
                <div className="space-y-4 animate-fade-up-4">
                  {/* Name Input (Signup only) */}
                  {mode === 'signup' && (
                    <div className="space-y-1.5 input-hud-field">
                      <label className="block text-xs font-medium text-neutral-200">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          id="input-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                            errors.name
                              ? 'border-white focus:ring-1 focus:ring-white/40'
                              : 'border-neutral-800 focus:border-white'
                          }`}
                        />
                      </div>
                      {errors.name && <p className="text-[11px] text-neutral-200 mt-1 font-medium">{errors.name}</p>}
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-1.5 input-hud-field">
                    <label className="block text-xs font-medium text-neutral-200">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        id="input-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="analyst@enterprise.io"
                        className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                          errors.email
                            ? 'border-white focus:ring-1 focus:ring-white/40'
                            : 'border-neutral-800 focus:border-white'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-[11px] text-neutral-200 mt-1 font-medium">{errors.email}</p>}
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5 input-hud-field">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-medium text-neutral-200">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          id="link-forgot-password"
                          type="button"
                          data-bloom="subtle"
                          onClick={() => setForgotModalOpen(true)}
                          className="text-xs text-neutral-300 hover:text-white transition-colors underline-offset-2 hover:underline cursor-pointer px-1 py-0.5 rounded-sm"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        id="input-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-9 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                          errors.password
                            ? 'border-white focus:ring-1 focus:ring-white/40'
                            : 'border-neutral-800 focus:border-white'
                        }`}
                      />
                      <button
                        id="btn-toggle-password"
                        type="button"
                        data-bloom="subtle"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-neutral-300 hover:text-white transition-colors cursor-pointer p-0.5 rounded-sm"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[11px] text-neutral-200 mt-1 font-medium">{errors.password}</p>}
                  </div>

                  {/* Confirm Password Input (Signup only) */}
                  {mode === 'signup' && (
                    <div className="space-y-1.5 input-hud-field">
                      <label className="block text-xs font-medium text-neutral-200">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Shield className="w-4 h-4 text-neutral-300 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          id="input-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full bg-neutral-950/90 border rounded-none pl-9 pr-9 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none transition-colors ${
                            errors.confirmPassword
                              ? 'border-white focus:ring-1 focus:ring-white/40'
                              : 'border-neutral-800 focus:border-white'
                          }`}
                        />
                        <button
                          id="btn-toggle-confirm-password"
                          type="button"
                          data-bloom="subtle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-neutral-300 hover:text-white transition-colors cursor-pointer p-0.5 rounded-sm"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-[11px] text-neutral-200 mt-1 font-medium">{errors.confirmPassword}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Layer 5: Primary Button with Hover Elevation & Click Press */}
                <div className="animate-fade-up-5 pt-1">
                  <button
                    id="btn-submit-auth"
                    type="submit"
                    data-bloom="primary"
                    disabled={isLoading || isSuccess}
                    className="btn-hud-primary btn-clip-corner w-full py-2.5 px-4 font-bold text-sm bg-white hover:bg-neutral-100 text-neutral-950 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                        <span>Processing Authenticated Session...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-neutral-950 animate-bounce" />
                        <span>Verified! Redirecting...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Security / Cookie Notice Footer (Retained, brightened) */}
        <div
          className="mt-5 text-center text-[11px] text-neutral-300 max-w-xs leading-relaxed animate-fade-up-6"
        >
          Protected by industry-standard bcrypt encryption and secure httpOnly token sessions.
        </div>
      </div>

      {/* Forgot Password Modal (Clean Cohesive Chamfered Style) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="hud-card-outer w-full max-w-sm p-[1px] shadow-2xl">
            <div className="hud-card-inner p-6 relative">
              <button
                type="button"
                data-bloom="subtle"
                onClick={() => setForgotModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 text-white mb-2">
                <KeyRound className="w-5 h-5 text-neutral-300" />
                <h3 className="text-sm font-bold text-white">Reset Password</h3>
              </div>
              <p className="text-xs text-neutral-300 mb-4">
                Enter your registered work email to receive password recovery instructions.
              </p>
              <form onSubmit={handleSendForgot}>
                <input
                  id="input-forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={forgotLoading}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-none px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-white placeholder:text-neutral-400"
                />
                <div className="flex space-x-2">
                  <button
                    id="btn-cancel-forgot"
                    type="button"
                    data-bloom="secondary"
                    disabled={forgotLoading}
                    onClick={() => setForgotModalOpen(false)}
                    className="flex-1 py-2 rounded-none text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-send-forgot"
                    type="submit"
                    data-bloom="primary"
                    disabled={forgotLoading}
                    className="btn-clip-corner flex-1 py-2 rounded-none text-xs font-bold bg-white hover:bg-neutral-100 text-neutral-950 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Link</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Google OAuth Setup / Client ID Configuration Dialog */}
      {googleConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="hud-card-outer w-full max-w-md p-[1px] shadow-2xl">
            <div className="hud-card-inner p-6 relative">
              <button
                type="button"
                data-bloom="subtle"
                onClick={() => setGoogleConfigModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 text-white mb-2">
                <GoogleIcon className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Google OAuth 2.0 Configuration</h3>
              </div>
              <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
                Real Google Sign-In requires an OAuth 2.0 Client ID from Google Cloud Console. Mock or hardcoded fake logins are strictly disabled.
              </p>

              <div className="space-y-3 text-xs text-neutral-300 mb-4">
                <div className="p-3 bg-neutral-900/90 border border-neutral-800 space-y-1 font-mono text-[11px]">
                  <div className="text-neutral-400 uppercase tracking-wider text-[10px]">Authorized JavaScript Origins:</div>
                  <div className="text-white font-semibold">http://localhost:5173</div>
                  <div className="text-white font-semibold">http://127.0.0.1:5173</div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-200">
                    Paste Google OAuth Client ID:
                  </label>
                  <input
                    id="input-google-client-id"
                    type="text"
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    placeholder="1234567890-abcdef.apps.googleusercontent.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono placeholder:text-neutral-500"
                  />
                  <p className="text-[10px] text-neutral-400">
                    You can also add this in <code className="text-white">frontend/.env</code> as <code className="text-white">VITE_GOOGLE_CLIENT_ID</code> and <code className="text-white">.env</code> as <code className="text-white">GOOGLE_CLIENT_ID</code>.
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  id="btn-close-google-config"
                  type="button"
                  data-bloom="secondary"
                  onClick={() => setGoogleConfigModalOpen(false)}
                  className="flex-1 py-2 rounded-none text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  id="btn-save-google-config"
                  type="button"
                  data-bloom="primary"
                  onClick={() => {
                    const clean = inputClientId.trim();
                    if (!clean || !clean.includes('.apps.googleusercontent.com')) {
                      showToast('Please enter a valid Google OAuth Client ID (ending in .apps.googleusercontent.com)', 'error');
                      return;
                    }
                    localStorage.setItem('GOOGLE_CLIENT_ID_OVERRIDE', clean);
                    setGoogleConfigModalOpen(false);
                    showToast('Google Client ID applied! Initializing Google Sign-In...', 'success');
                    window.location.reload();
                  }}
                  className="btn-clip-corner flex-1 py-2 rounded-none text-xs font-bold bg-white hover:bg-neutral-100 text-neutral-950 transition-colors cursor-pointer"
                >
                  Apply & Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
