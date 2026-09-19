import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, MapPin, History, Bell, User, Menu, X, Wifi, WifiOff,
  Settings, ChevronRight, Accessibility, Shield, LogOut, Navigation
} from 'lucide-react';
import { useAppStore } from '../../store';
import { StatusDot } from '../ui';
import { isGuestAccount, getOrCreateCommuterPass } from '../../utils/authUtils';
import { LocationRegionBanner } from '../LocationRegionBanner';

export function PassengerLayout() {
  const { state, setAccessibilitySettings } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isGuest = isGuestAccount(state.currentUser);
  const commuterPass = getOrCreateCommuterPass(state.currentUser);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const navItems = [
    { path: '/app', icon: Home, label: 'Home' },
    { path: '/plan', icon: Navigation, label: 'Plan Trip' },
    { path: '/routes', icon: MapPin, label: 'Routes' },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { path: '/profile', icon: User, label: 'Account' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">

      {/* Desktop Header (Uber-style) */}
      <header className="hidden md:flex items-center justify-between bg-black text-white px-6 h-16 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Maarg Darshan Home">
            <img
              src="/logo.png"
              alt="Maarg Darshan Logo"
              className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="font-black text-white text-xl tracking-tight">मार्ग Darshan</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(item => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all relative ${
                    active
                      ? 'bg-neutral-800 text-white font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Automatic Live GPS Finder */}
          <LocationRegionBanner compact dark />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
            <StatusDot status={state.isOffline ? 'offline' : 'online'} />
            <span>{state.isOffline ? 'Offline' : 'Live Network'}</span>
          </div>

          {!isGuest && state.currentUser ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border border-neutral-700 shadow-xs"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                ✓
              </div>
              <div className="text-left">
                <span className="block text-white leading-tight font-black">{state.currentUser.name}</span>
                <span className="block text-[10px] text-neutral-400 font-mono font-medium">{commuterPass.passId}</span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="bg-white hover:bg-neutral-200 text-black px-4 py-1.5 rounded-full text-xs font-extrabold transition-all shadow-sm"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between gap-1.5 bg-black text-white px-3 h-14 sticky top-0 z-[1100] shadow-sm w-full max-w-full">
        {/* Brand: Always full and never shrunk or overlapped */}
        <Link to="/app" className="flex items-center gap-1.5 shrink-0 select-none min-w-0" aria-label="Maarg Darshan Home">
          <img
            src="/logo.png"
            alt="Maarg Darshan Logo"
            className="w-7 h-7 rounded-lg bg-white p-0.5 object-contain shrink-0 shadow-xs"
          />
          <span className="font-black text-white text-sm tracking-tight whitespace-nowrap">मार्ग Darshan</span>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <LocationRegionBanner compact dark className="py-1 px-2" />
          <Link to="/notifications" className="relative p-1.5 text-neutral-300 hover:text-white shrink-0" aria-label="Notifications">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
            )}
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 text-neutral-300 hover:text-white shrink-0 cursor-pointer" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Maarg Darshan Logo"
                    className="w-7 h-7 rounded-lg bg-neutral-100 p-0.5 object-contain"
                  />
                  <span className="font-black text-lg tracking-tight text-neutral-900">मार्ग Darshan</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-neutral-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      isActive(item.path) ? 'bg-neutral-100 text-black' : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5 text-neutral-600" />
                    <span>{item.label}</span>
                    {item.badge ? <span className="ml-auto bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{item.badge}</span> : null}
                  </Link>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 space-y-1">
                <Link to="/journeys" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  <History className="w-5 h-5 text-neutral-600" /> Past Trips
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              {!isGuest && state.currentUser ? (
                <div className="p-3.5 rounded-2xl bg-neutral-900 text-white border border-neutral-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">✓</div>
                      <div className="font-bold text-xs text-white leading-tight">{state.currentUser.name}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px]">
                    <span className="text-neutral-400">Pass ID:</span>
                    <span className="text-white font-mono font-bold">{commuterPass.passId}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-2.5 bg-neutral-900 text-white text-center rounded-xl font-bold text-xs hover:bg-black transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Outlet */}
      <main className="pb-24 md:pb-8 flex-1 w-full max-w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Bar (Uber/Citymapper style, safe area, high touch-target) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200 h-[60px] px-1 flex items-center justify-around z-40 shadow-lg pb-[env(safe-area-inset-bottom)] select-none" aria-label="Mobile bottom navigation">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1 px-1 rounded-xl transition-all relative ${
                active ? 'text-black font-extrabold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${active ? 'bg-neutral-100 text-black' : ''}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight leading-none ${active ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.badge ? (
                <span className="absolute top-1 right-2.5 w-2 h-2 bg-red-600 rounded-full" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ============ OPERATOR LAYOUT ============
export function OperatorLayout() {
  const { state } = useAppStore();
  const location = useLocation();

  const navItems = [
    { path: '/operator', icon: Home, label: 'Overview', exact: true },
    { path: '/operator/routes', icon: MapPin, label: 'Route Dispatch' },
    { path: '/operator/vehicles', icon: Accessibility, label: 'Fleet Telemetry' },
    { path: '/operator/conditions', icon: Settings, label: 'Live Conditions' },
    { path: '/operator/reports', icon: History, label: 'Passenger Reports', badge: state.reports.filter(r => r.status === 'NEW').length },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex font-sans">
      <aside className="w-64 bg-black text-white p-5 flex flex-col justify-between hidden lg:flex">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="font-black text-2xl tracking-tight">ACCESS</span>
            <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded font-bold uppercase text-neutral-400">OPS</span>
          </div>

          <nav className="space-y-1" aria-label="Operator nav">
            {navItems.map(item => {
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-neutral-800">
          <Link to="/app" className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white">
            <LogOut className="w-4 h-4" /> Exit to Passenger App
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-neutral-200 h-14 flex items-center justify-between px-6 sticky top-0 z-30">
          <span className="font-bold text-sm text-neutral-800">Fleet Operations Grid</span>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
            <StatusDot status="online" />
            <span>Dispatch System Connected</span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
