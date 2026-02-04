import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, getSupabaseDiagnostic } from '../lib/supabase';

export interface LocalUser {
  id: string;
  email: string;
}

interface LoginFormProps {
  onSuccess: (user: LocalUser) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const d = getSupabaseDiagnostic();
    console.log('[Auth] Supabase diagnostic:', d, d.configured ? '→ Using Supabase' : '→ URL set:', d.urlSet, 'Anon key set:', d.anonKeySet);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const emailTrim = email.trim();
    if (!emailTrim) {
      setAuthError('Please enter your email');
      setAuthLoading(false);
      return;
    }

    if (isSupabaseConfigured() && supabase) {
      if (!password || password.length < 6) {
        setAuthError('Password must be at least 6 characters');
        setAuthLoading(false);
        return;
      }
      const expectedKey = import.meta.env.VITE_REGISTRATION_KEY;
      if (isSignUp && typeof expectedKey === 'string' && expectedKey.trim() !== '') {
        if (registrationKey.trim() !== expectedKey.trim()) {
          setAuthError('Invalid registration key');
          setAuthLoading(false);
          return;
        }
      }
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({ email: emailTrim, password });
          if (error) {
            console.error('[Supabase] signUp error:', error.message, error.status, error);
            throw error;
          }
          const user = data.user;
          if (user?.email) onSuccess({ id: user.id, email: user.email });
          setEmail('');
          setPassword('');
          setRegistrationKey('');
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email: emailTrim, password });
          if (error) {
            console.error('[Supabase] signIn error:', error.message, error.status, error);
            throw error;
          }
          const user = data.user;
          if (user?.email) onSuccess({ id: user.id, email: user.email });
          setEmail('');
          setPassword('');
        }
      } catch (err: unknown) {
        console.error('[Login] Auth error:', err);
        const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong');
        setAuthError(message);
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    // No Supabase: local session only (no real auth, nothing saved to DB)
    try {
      onSuccess({ id: 'local', email: emailTrim });
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAuthLoading(false);
    }
  };

  const isLocalMode = !isSupabaseConfigured();

  return (
    <div className="space-y-6">
      {isLocalMode && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-sm">
          <strong>Local mode.</strong> No account is saved and any email will “log in”. To use Supabase: set <code className="bg-white/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-white/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> where you build, then <strong>rebuild</strong>. Open the browser console (F12) and look for <code className="bg-white/10 px-1 rounded">[Auth] Supabase diagnostic</code> — it shows whether the app sees those variables.
        </div>
      )}
      <div className="flex justify-center space-x-1 bg-white/5 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setIsSignUp(false)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            !isSignUp
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(true)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            isSignUp
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>

        {isSignUp && isSupabaseConfigured() && typeof import.meta.env.VITE_REGISTRATION_KEY === 'string' && import.meta.env.VITE_REGISTRATION_KEY.trim() !== '' && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Registration key
            </label>
            <input
              type="password"
              value={registrationKey}
              onChange={(e) => setRegistrationKey(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter registration key"
            />
          </div>
        )}

        {authError && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {authLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
