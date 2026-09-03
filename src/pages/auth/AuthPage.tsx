import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Input, Modal } from '../../components/ui';
import { Lock, Mail, User, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import { authApi } from '../../api';

// Declare google global for TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            },
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

/** Decode a Google JWT credential to extract user info (no backend needed) */
function parseGoogleJwt(token: string): { name: string; email: string; picture?: string; sub: string } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return {
      name: payload.name || payload.given_name || 'Google User',
      email: payload.email || '',
      picture: payload.picture,
      sub: payload.sub,
    };
  } catch {
    return null;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, updateProfile, setEmergencyContact } = useAppStore();
  const { addToast } = useToast();

  const originParam = searchParams.get('origin');
  const destParam = searchParams.get('destination');
  const mobilityParam = searchParams.get('mobility');

  const getTargetUrl = () => {
    if (originParam && destParam) {
      return `/plan?origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&mobility=${encodeURIComponent(mobilityParam || 'wheelchair')}`;
    }
    return '/plan';
  };

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mobility, setMobility] = useState<'wheelchair' | 'walking-difficulty' | 'elderly' | 'none'>('wheelchair');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Post-login Emergency SOS Setup Modal
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [emergencyName, setEmergencyName] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [emergencyRelation, setEmergencyRelation] = useState<string>('Family');
  const [savedUserTemp, setSavedUserTemp] = useState<any>(null);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const gsiInitialized = useRef(false);

  // ─── Google Identity Services initialization ─────────────────────────────
  const handleGoogleCredential = React.useCallback(
    async (response: { credential: string }) => {
      setIsGoogleLoading(true);
      setAuthError(null);
      try {
        const userData = parseGoogleJwt(response.credential);
        if (!userData || !userData.email) {
          throw new Error('Could not read Google account info. Please try again.');
        }

        const googleUser = {
          id: `google-${userData.sub}`,
          name: userData.name,
          email: userData.email,
          photoUrl: userData.picture,
          role: 'passenger' as const,
          profile: {
            mobility: 'none' as const,
            stairs: 'acceptable' as const,
            walkingTolerance: 'moderate' as const,
            crowding: 'avoid' as const,
            vision: 'normal' as const,
            hearing: 'normal' as const,
            safetyPreferences: ['late-night' as const, 'prefer-safer' as const],
          },
        };

        // Store token (credential is the JWT itself)
        localStorage.setItem('access_token', response.credential);
        localStorage.setItem('google_user_photo', userData.picture || '');

        setUser(googleUser);
        updateProfile(googleUser.profile);
        addToast('success', `Welcome, ${googleUser.name}! Signed in with Google.`);

        // Prompt SOS setup for new Google users
        setSavedUserTemp(googleUser);
        setShowSosModal(true);
      } catch (err: any) {
        const errMsg = err?.message || 'Google Sign-In failed. Please try again.';
        setAuthError(errMsg);
        addToast('error', errMsg);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [setUser, updateProfile, addToast],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here.apps.googleusercontent.com') return;
    if (gsiInitialized.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;
      gsiInitialized.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
          width: googleButtonRef.current.offsetWidth || 400,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCredential, mode]);

  // Re-render button when mode changes
  useEffect(() => {
    if (!window.google?.accounts?.id || !googleButtonRef.current) return;
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here.apps.googleusercontent.com') return;
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'rectangular',
      width: googleButtonRef.current.offsetWidth || 400,
    });
  }, [mode]);

  // ─── Manual Google Sign-In fallback button (when no Client ID configured) ──
  const handleGoogleFallback = () => {
    setAuthError('Google Sign-In requires a Client ID. Set VITE_GOOGLE_CLIENT_ID in your .env file. See the README for setup instructions.');
  };

  // ─── Email/Password Auth ──────────────────────────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !email.includes('@') || !email.includes('.')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && (!name || name.trim().length === 0)) {
      setAuthError('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim() || undefined,
          password,
        });

        if (res?.token) localStorage.setItem('access_token', res.token);

        const newUser = {
          id: res?.user?.id || `user-${Date.now()}`,
          name: res?.user?.name || name.trim(),
          email: res?.user?.email || email.trim(),
          phoneNumber: phone.trim() || undefined,
          role: 'passenger' as const,
          profile: {
            mobility: mobility,
            stairs: mobility === 'wheelchair' ? ('avoid' as const) : ('acceptable' as const),
            walkingTolerance: mobility === 'wheelchair' || mobility === 'elderly' ? ('low' as const) : ('moderate' as const),
            crowding: 'avoid' as const,
            vision: 'normal' as const,
            hearing: 'normal' as const,
            safetyPreferences: ['late-night' as const, 'prefer-safer' as const],
          },
          emergencyContact: res?.user?.emergencyContact
            ? {
                name: res.user.emergencyContact.name,
                phone: res.user.emergencyContact.phone,
                relationship: res.user.emergencyContact.relationship || 'Family',
              }
            : undefined,
        };

        setUser(newUser);
        updateProfile(newUser.profile);
        addToast('success', `Account created successfully! Welcome, ${newUser.name}`);

        if (!newUser.emergencyContact?.phone) {
          setSavedUserTemp(newUser);
          setShowSosModal(true);
          return;
        }
        navigate(getTargetUrl());
      } else {
        const res = await authApi.login({ email: email.trim(), password });
        if (res?.token) localStorage.setItem('access_token', res.token);

        const loggedInUser = {
          id: res?.user?.id || `user-${Date.now()}`,
          name: res?.user?.name || email.split('@')[0],
          email: res?.user?.email || email.trim(),
          phoneNumber: (res?.user as any)?.phoneNumber,
          role: 'passenger' as const,
          profile: {
            mobility: mobility,
            stairs: 'avoid' as const,
            walkingTolerance: 'low' as const,
            crowding: 'avoid' as const,
            vision: 'normal' as const,
            hearing: 'normal' as const,
            safetyPreferences: ['late-night' as const, 'prefer-safer' as const],
          },
          emergencyContact: res?.user?.emergencyContact
            ? {
                name: res.user.emergencyContact.name,
                phone: res.user.emergencyContact.phone,
                relationship: res.user.emergencyContact.relationship || 'Family',
              }
            : undefined,
        };

        setUser(loggedInUser);
        addToast('success', `Signed in as ${loggedInUser.name}`);

        if (!loggedInUser.emergencyContact?.phone) {
          setSavedUserTemp(loggedInUser);
          setShowSosModal(true);
          return;
        }
        navigate(getTargetUrl());
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const errMsg = err?.message || 'Authentication failed. Please verify your credentials.';
      setAuthError(errMsg);
      addToast('error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSosModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyPhone || emergencyPhone.trim().length < 6) {
      addToast('error', 'Please provide a valid emergency contact phone number.');
      return;
    }
    const contact = {
      name: emergencyName.trim() || 'Emergency Contact',
      phone: emergencyPhone.trim(),
      relationship: emergencyRelation || 'Family',
    };
    setEmergencyContact(contact);
    try {
      await authApi.updateEmergencyContact(contact);
      addToast('success', 'Emergency SOS Contact saved to your account!');
    } catch {
      addToast('success', 'Emergency SOS Contact saved locally.');
    }
    setShowSosModal(false);
    navigate(getTargetUrl());
  };

  const handleSkipSosModal = () => {
    setShowSosModal(false);
    navigate(getTargetUrl());
  };

  const handleGuestMode = () => {
    const guestUser = {
      id: `guest-${Date.now()}`,
      name: 'Guest Passenger',
      email: 'guest@transit.maarg',
      isGuest: true,
      role: 'passenger' as const,
      profile: {
        mobility: 'wheelchair' as const,
        stairs: 'avoid' as const,
        walkingTolerance: 'low' as const,
        crowding: 'avoid' as const,
        vision: 'normal' as const,
        hearing: 'normal' as const,
        safetyPreferences: ['late-night' as const, 'prefer-safer' as const],
      },
      emergencyContact: undefined,
    };
    setUser(guestUser);
    updateProfile(guestUser.profile);
    addToast('info', 'Continuing as Guest Passenger. Sign in anytime to activate Emergency SOS.');
    navigate(getTargetUrl());
  };

  const hasClientId =
    !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your-google-client-id-here.apps.googleusercontent.com';

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        {/* Brand Logo & Heading */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto mb-2 font-black text-xl shadow-md">
            M
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {mode === 'signup' ? 'Create Passenger Account' : 'Sign in to Maarg Darshan'}
          </h1>
          <p className="text-xs text-neutral-500">
            {mode === 'signup'
              ? 'Join to save accessible routes & emergency SOS contacts'
              : 'Enter your credentials to continue your journey'}
          </p>
        </div>

        {/* ── Google Sign-In Button ────────────────────────────── */}
        <div className="space-y-2">
          {hasClientId ? (
            /* Google renders its own button into this div when Client ID is set */
            <div
              ref={googleButtonRef}
              id="google-signin-button"
              className="w-full flex justify-center"
              style={{ minHeight: '44px' }}
            />
          ) : (
            /* Fallback styled button when no Client ID is configured */
            <button
              type="button"
              onClick={handleGoogleFallback}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-sm transition-all shadow-xs disabled:opacity-60"
            >
              {/* Google SVG Logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {isGoogleLoading ? 'Signing in with Google...' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">or continue with email</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <Input
              label="Full Name"
              placeholder="e.g. Ananya Roy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<User className="w-4 h-4" />}
              required
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          {mode === 'signup' && (
            <Input
              label="Mobile Number (Optional)"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-4 h-4" />}
            />
          )}

          <Input
            label="Password"
            type="password"
            placeholder="•••••••• (Min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          {mode === 'signup' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-neutral-700 block">
                Primary Mobility Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'wheelchair', label: '♿ Wheelchair' },
                  { id: 'elderly', label: '🧓 Senior' },
                  { id: 'none', label: '🚶 Standard' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMobility(m.id as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      mobility === m.id
                        ? 'bg-black text-white border-black'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 text-sm font-bold shadow-md mt-2"
          >
            {isLoading
              ? 'Validating & Authenticating...'
              : mode === 'signup'
              ? 'Create Account'
              : 'Sign In'}
          </Button>
        </form>

        {/* Toggle Login / Signup */}
        <div className="text-center text-xs text-neutral-500 pt-1">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setAuthError(null); }}
                className="font-bold text-black hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setAuthError(null); }}
                className="font-bold text-black hover:underline"
              >
                Create Account
              </button>
            </span>
          )}
        </div>

        {/* Divider + Guest Mode */}
        <div className="relative border-t border-neutral-200 pt-3 text-center">
          <span className="bg-white px-3 text-[11px] font-bold text-neutral-400 uppercase tracking-wider relative -top-5.5">
            Or quick access
          </span>
        </div>

        <button
          type="button"
          onClick={handleGuestMode}
          className="w-full py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <span>⚡ Continue as Guest (One-Time / No Login)</span>
        </button>
      </div>

      {/* Emergency SOS Setup Modal */}
      <Modal open={showSosModal} onClose={handleSkipSosModal} title="🛡️ Setup Emergency SOS Contact">
        <form onSubmit={handleSaveSosModal} className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Keep Your Journeys Protected</span>
              <span className="text-[11px] text-red-800 block mt-0.5">
                Set up your emergency SOS contact number so real-time SMS alerts with live GPS coordinates can be dispatched during late-night rides or emergencies.
              </span>
            </div>
          </div>

          <Input
            label="Emergency Contact Name"
            placeholder="e.g. Parent / Spouse / Guardian"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            required
          />
          <Input
            label="Emergency Mobile Phone"
            type="tel"
            placeholder="+91 98765 43210"
            icon={<Phone className="w-4 h-4" />}
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            required
          />
          <Input
            label="Relationship"
            placeholder="e.g. Sister / Father / Friend"
            value={emergencyRelation}
            onChange={(e) => setEmergencyRelation(e.target.value)}
          />

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleSkipSosModal}
              className="text-xs text-neutral-500 hover:text-black underline font-semibold"
            >
              Setup Later
            </button>
            <Button type="submit" size="sm" className="font-bold">
              Save SOS Contact & Continue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
