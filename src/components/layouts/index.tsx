import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, MapPin, History, Bell, User, Menu, X, Wifi, WifiOff,
  Settings, ChevronRight, Accessibility, Shield, LogOut, Navigation
} from 'lucide-react';
import { useAppStore } from '../../store';
import { StatusDot } from '../ui';

export function PassengerLayout() {
  const { state, setAccessibilitySettings } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const navItems = [
    { path: '/app', icon: Home, label: 'Trip' },
    { path: '/plan', icon: Navigation, label: 'Plan Route' },
    { path: '/routes', icon: MapPin, label: 'Routes' },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { path: '/profile', icon: User, label: 'Account' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* Uber Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between bg-black text-white px-8 h-16 sticky top-0 z-[1100] shadow-md">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Maarg Darshan Home">
            <img
              src="/logo.png"
              alt="Maarg Darshan Logo"
              className="w-8 h-8 rounded-lg bg-white p-0.5 object-contain shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="font-black text-white text-xl tracking-tight">Maarg Darshan</span>
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
            <StatusDot status={state.isOffline ? 'offline' : 'online'} />
            <span>{state.isOffline ? 'Offline' : 'Live Network'}</span>
          </div>

          {state.currentUser ? (
            <Link to="/profile" className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all">
              <User className="w-3.5 h-3.5" />
              <span>{state.currentUser.name}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all">
                <User className="w-3.5 h-3.5" />
                <span>Guest Mode</span>
              </Link>
              <Link to="/login" className="bg-white text-black hover:bg-neutral-200 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-black text-white px-4 h-14 sticky top-0 z-[1100] shadow-md">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Maarg Darshan Logo"
            className="w-7 h-7 rounded-lg bg-white p-0.5 object-contain"
          />
          <span className="font-black text-white text-lg tracking-tight">Maarg Darshan</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative p-2 text-neutral-300" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full" />
            )}
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-neutral-300" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Maarg Darshan Logo"
                    className="w-7 h-7 rounded-lg bg-neutral-100 p-0.5 object-contain"
                  />
                  <span className="font-black text-lg tracking-tight text-neutral-900">Maarg Darshan</span>
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

              <div className="mt-6 pt-4 border-t border-neutral-200 space-y-1">
                <Link to="/journeys" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                  <History className="w-5 h-5 text-neutral-600" /> Past Trips
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              {state.currentUser ? (
                <div className="text-xs text-neutral-500">
                  Logged in as <strong className="text-neutral-900">{state.currentUser.name}</strong>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2.5 bg-neutral-100 text-center rounded-xl font-bold text-xs">
                    Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="py-2.5 bg-black text-white text-center rounded-xl font-bold text-xs">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Outlet */}
      <main className="pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Floating Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-4 flex items-center justify-around z-30 shadow-lg" aria-label="Mobile bottom navigation">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                active ? 'text-black font-bold' : 'text-neutral-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge ? (
                <span className="absolute top-0 right-2 w-2 h-2 bg-red-600 rounded-full" />
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
