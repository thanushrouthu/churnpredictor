import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { supabase } from '../utils/supabase.js';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000';

export default function ProtectedRoute({ currentUser, setCurrentUser }) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyActiveSession = async () => {
      try {
        // 1. Check active Supabase session
        const { data, error } = await supabase.auth.getSession();
        const supabaseSession = data?.session;

        // 2. Check FastAPI backend session (/auth/me) for httpOnly cookie persistence
        let backendUser = null;
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
          });
          if (res.ok) {
            backendUser = await res.json();
          }
        } catch {
          // Backend may be offline or session absent
        }

        if (!isMounted) return;

        if (supabaseSession?.user || backendUser || currentUser) {
          const resolvedUser =
            backendUser ||
            currentUser ||
            {
              id: supabaseSession?.user?.id,
              name:
                supabaseSession?.user?.user_metadata?.name ||
                supabaseSession?.user?.email?.split('@')[0] ||
                'Enterprise Analyst',
              email: supabaseSession?.user?.email,
              avatar_url: supabaseSession?.user?.user_metadata?.avatar_url,
            };

          setIsAuthenticated(true);
          if (setCurrentUser && !currentUser) {
            setCurrentUser(resolvedUser);
          }
        } else {
          setIsAuthenticated(false);
          if (setCurrentUser) {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
        if (isMounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    verifyActiveSession();

    // Ongoing Supabase auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        if (setCurrentUser) setCurrentUser(null);
      } else if (session?.user) {
        setIsAuthenticated(true);
        if (setCurrentUser) {
          setCurrentUser((prev) => prev || {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Enterprise Analyst',
            email: session.user.email,
          });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname]);

  // Loading Screen while verifying session - prevents dashboard content flash
  if (isChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4 text-white font-sans">
        <div className="w-10 h-10 bg-white flex items-center justify-center shadow-2xl animate-pulse">
          <Zap className="w-5 h-5 text-neutral-950 fill-neutral-950" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-medium text-neutral-400">
            Verifying enterprise security credentials...
          </span>
        </div>
      </div>
    );
  }

  // If unauthenticated: Immediately redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
