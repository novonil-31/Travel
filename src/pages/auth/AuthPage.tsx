import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Input } from '../../components/ui';
import { Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';
import { DEMO_USER } from '../../data/mock';
import { authApi } from '../../api';

export default function AuthPage({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const { setUser, updateProfile } = useAppStore();
  const { addToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mobility, setMobility] = useState<'wheelchair' | 'walking-difficulty' | 'elderly' | 'none'>('wheelchair');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await authApi.register({
          name: name || 'Aarav Sharma',
          email: email || 'aarav@transit.access',
          phoneNumber: phone || '+919876543210',
          password: password || 'SecureTransitPass123!',
        });
        if (res?.token) {
          localStorage.setItem('access_token', res.token);
        }
        setUser({
          ...DEMO_USER,
          id: res?.user?.id || DEMO_USER.id,
          name: res?.user?.name || name || 'Aarav Sharma',
          email: res?.user?.email || email || 'aarav@transit.access',
          phoneNumber: phone || DEMO_USER.phoneNumber,
        });
        addToast('success', `Account created! Welcome, ${res?.user?.name || name || 'Aarav'}`);
      } else {
        const res = await authApi.login({
          email: email || 'aarav@transit.access',
          phoneNumber: phone || undefined,
          password: password || 'SecureTransitPass123!',
        });
        if (res?.token) {
          localStorage.setItem('access_token', res.token);
        }
        setUser({
          ...DEMO_USER,
          id: res?.user?.id || DEMO_USER.id,
          name: res?.user?.name || (email.split('@')[0] ? email.split('@')[0].toUpperCase() : 'Aarav'),
          email: res?.user?.email || email || 'aarav@transit.access',
        });
        addToast('success', `Signed in as ${res?.user?.name || name || 'Aarav'}`);
      }
      navigate('/plan');
    } catch (err: any) {
      console.warn('API auth fallback:', err);
      // Fallback for offline/demo mode
      setUser({
        ...DEMO_USER,
        name: name || (email.split('@')[0] ? email.split('@')[0].toUpperCase() : 'Aarav'),
        email: email || 'aarav@transit.access',
      });
      addToast('success', `Signed in as ${name || 'Aarav'}`);
      navigate('/plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPersona = (persona: 'wheelchair' | 'senior') => {
    setUser({
      ...DEMO_USER,
      name: persona === 'wheelchair' ? 'Aarav (Wheelchair)' : 'Meera (Senior)',
      email: persona === 'wheelchair' ? 'aarav@access.org' : 'meera@access.org',
    });
    updateProfile({
      mobility: persona === 'wheelchair' ? 'wheelchair' : 'elderly',
      stairs: 'avoid',
      walkingTolerance: 'low',
      crowding: 'avoid',
      vision: 'normal',
      hearing: 'normal',
      safetyPreferences: ['late-night', 'prefer-safer'],
    });
    addToast('success', `Loaded ${persona === 'wheelchair' ? 'Wheelchair Profile' : 'Senior Profile'}`);
    navigate('/plan');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between">
      {/* Top Uber-Style Header */}
      <header className="bg-black text-white px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-black tracking-tight text-white">
          ACCESS
        </Link>
        <Link to="/" className="text-xs font-semibold text-neutral-300 hover:text-white">
          Exit to Home
        </Link>
      </header>

      {/* Main Form Container */}
      <div className="max-w-md w-full mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">
            {mode === 'login' ? 'What\'s your email or phone?' : 'Create your transit account'}
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            {mode === 'login' ? 'Sign in to access saved barrier-free journeys & safety contacts.' : 'Configure your mobility requirements for customized step-free transit.'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'login' ? 'bg-white text-black shadow-sm' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'signup' ? 'bg-white text-black shadow-sm' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Input
                label="Full Name"
                placeholder="e.g. Aarav Sharma"
                icon={<User className="w-4 h-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Emergency Phone"
                placeholder="+91 98765 43210"
                icon={<Phone className="w-4 h-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Primary Mobility Requirement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'wheelchair', label: '♿ Wheelchair User' },
                    { id: 'walking-difficulty', label: '🦯 Walking Aid' },
                    { id: 'elderly', label: '👵 Senior Citizen' },
                    { id: 'none', label: '🚶 Standard Transit' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMobility(item.id as any)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                        mobility === item.id
                          ? 'bg-neutral-900 border-neutral-900 text-white'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            size="lg"
            className="w-full py-4 text-sm font-bold"
            loading={isLoading}
          >
            {mode === 'login' ? 'Continue' : 'Create Account'}
          </Button>
        </form>

        {/* 1-Click Guest & Demo Access */}
        <div className="pt-6 border-t border-neutral-200 space-y-3">
          <button
            type="button"
            onClick={() => {
              setUser({
                ...DEMO_USER,
                name: 'Guest Passenger',
                email: 'guest@access.org',
              });
              addToast('info', 'Continuing in Guest Mode (No login required)');
              navigate('/plan');
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <span>⚡ Continue as Guest (One-Time / No Login)</span>
          </button>

          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block text-center pt-1">
            Quick Persona Shortcuts:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickPersona('wheelchair')}
              className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-center transition-all"
            >
              <span className="text-base block mb-0.5">♿</span>
              <span className="text-xs font-bold text-neutral-900 block">Wheelchair User</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPersona('senior')}
              className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-center transition-all"
            >
              <span className="text-base block mb-0.5">👵</span>
              <span className="text-xs font-bold text-neutral-900 block">Senior Citizen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-8 text-center text-xs text-neutral-500 border-t border-neutral-200">
        ACCESS • Accessible Public Transit Network
      </footer>
    </div>
  );
}
