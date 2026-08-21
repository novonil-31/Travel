import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, MapPin, History, Bell, User, Menu, X, Wifi, WifiOff,
  Settings, ChevronRight, Accessibility, Shield, LogOut, Sparkles, Navigation
} from 'lucide-react';
import { useAppStore } from '../../store';
import { StatusDot } from '../ui';

export function PassengerLayout() {
  const { state, setAccessibilitySettings } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unreadCount = state.notifications.filter(n => !n.read).length;

  const navItems = [
    { path: '/app', icon: Home, label: 'Home' },
    { path: '/plan', icon: Navigation, label: 'Plan Trip' },
    { path: '/routes', icon: MapPin, label: 'Routes' },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen bg-dark-950 text-slate-100 font-sans ${state.accessibilitySettings.largerText ? 'text-lg' : ''} ${state.accessibilitySettings.highContrast ? 'contrast-more' : ''}`}>
      {/* Background ambient lighting halos */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between bg-dark-900/80 backdrop-blur-2xl border-b border-white/10 px-8 h-20 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-3 group" aria-label="ACCESS Home">
          <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-glow-green group-hover:scale-105 transition-transform">
            <Accessibility className="w-6 h-6 text-dark-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-xl tracking-tight">ACCESS</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">AI 2.0</span>
            </div>
            <span className="text-xs text-slate-400 block -mt-0.5">Accessible Public Transit</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 bg-dark-950/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md" aria-label="Main navigation">
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 backdrop-blur-md">
            {state.isOffline ? <WifiOff className="w-3.5 h-3.5 text-slate-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
            <StatusDot status={state.isOffline ? 'offline' : 'online'} />
            <span>{state.isOffline ? 'Offline Mode' : 'Live Network'}</span>
          </div>

          {state.demoMode && (
            <Link to="/demo" className="px-3 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-500/25 transition-all shadow-sm shadow-amber-500/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo HUD
            </Link>
          )}

          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
            aria-label="Accessibility settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/operator')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/15 transition-all hover:border-cyan-400/40"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            Operator Portal
          </button>
        </div>
      </header>

      {/* Accessibility Settings Dropdown (Desktop) */}
      {settingsOpen && (
        <div className="hidden md:block absolute right-8 top-24 z-50 bg-dark-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/15 p-5 w-72 animate-slide-up">
          <h3 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-emerald-400" /> Accessibility Overrides
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
              <span className="text-xs font-semibold text-slate-300">Larger Text Mode</span>
              <input
                type="checkbox"
                checked={state.accessibilitySettings.largerText}
                onChange={(e) => setAccessibilitySettings({ largerText: e.target.checked })}
                className="w-4 h-4 rounded bg-dark-950 border-white/20 text-emerald-500 focus:ring-emerald-400"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
              <span className="text-xs font-semibold text-slate-300">High Contrast</span>
              <input
                type="checkbox"
                checked={state.accessibilitySettings.highContrast}
                onChange={(e) => setAccessibilitySettings({ highContrast: e.target.checked })}
                className="w-4 h-4 rounded bg-dark-950 border-white/20 text-emerald-500 focus:ring-emerald-400"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
              <span className="text-xs font-semibold text-slate-300">Reduced Motion</span>
              <input
                type="checkbox"
                checked={state.accessibilitySettings.reducedMotion}
                onChange={(e) => setAccessibilitySettings({ reducedMotion: e.target.checked })}
                className="w-4 h-4 rounded bg-dark-950 border-white/20 text-emerald-500 focus:ring-emerald-400"
              />
            </label>
          </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-dark-950/80 backdrop-blur-xl border-b border-white/10 px-4 h-16 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-glow-green">
            <Accessibility className="w-5 h-5 text-dark-950 font-bold" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">ACCESS</span>
        </Link>
        <div className="flex items-center gap-2">
          {state.demoMode && (
            <Link to="/demo" className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full">
              DEMO
            </Link>
          )}
          <Link to="/notifications" className="relative p-2 rounded-xl bg-white/5 border border-white/10" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
            <Bell className="w-4 h-4 text-slate-200" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200" aria-label="Open menu">
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Slide Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-dark-900 border-l border-white/15 shadow-2xl p-6 flex flex-col justify-between animate-slide-in-right">
            <div>
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center">
                    <Accessibility className="w-4 h-4 text-dark-950 font-bold" />
                  </div>
                  <span className="font-black text-white text-lg">ACCESS MENU</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-xl bg-white/5 text-slate-400" aria-label="Close menu"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-1.5" aria-label="Mobile navigation">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      isActive(item.path) ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 font-bold shadow-md' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge ? <span className="ml-auto bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{item.badge}</span> : <ChevronRight className="w-4 h-4 ml-auto text-slate-500" />}
                  </Link>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
                <Link to="/journeys" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-300 hover:bg-white/5">
                  <History className="w-5 h-5 text-cyan-400" /> Past Journeys
                </Link>
                <Link to="/operator" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-300 hover:bg-white/5">
                  <Shield className="w-5 h-5 text-emerald-400" /> Operator Dashboard
                </Link>
                <Link to="/modules" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-300 hover:bg-white/5">
                  <Settings className="w-5 h-5 text-purple-400" /> Module Marketplace
                </Link>
                <Link to="/demo" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Demo Control HUD
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-xs text-slate-500 text-center">
              ACCESS v2.0 • Hackathon Edition
            </div>
          </div>
        </div>
      )}

      {/* Main Page Container */}
      <main className="relative z-10 pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* Ultra-modern Floating Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-dark-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-1.5 shadow-2xl flex items-center justify-around" aria-label="Bottom navigation">
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 px-3.5 rounded-2xl transition-all relative ${
                active
                  ? 'text-emerald-400 bg-white/10 shadow-sm font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className={`w-5 h-5 transition-transform ${active ? 'scale-110 text-emerald-400' : ''}`} />
              <span className="text-[10px] font-semibold mt-1 tracking-tight">{item.label}</span>
              {item.badge ? (
                <span className="absolute -top-1 right-2 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Offline Alert Banner */}
      {state.isOffline && (
        <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md bg-dark-900/95 border border-amber-500/40 text-amber-300 text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 z-30" role="alert">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Offline mode active. Using cached accessible maps and schedules.</span>
        </div>
      )}
    </div>
  );
}

// ============ OPERATOR LAYOUT ============
export function OperatorLayout() {
  const { state } = useAppStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/operator', icon: Home, label: 'Control Center', exact: true },
    { path: '/operator/routes', icon: MapPin, label: 'Route Dispatch' },
    { path: '/operator/vehicles', icon: Accessibility, label: 'Fleet Telemetry' },
    { path: '/operator/conditions', icon: Settings, label: 'Live Conditions' },
    { path: '/operator/reports', icon: History, label: 'Passenger Reports', badge: state.reports.filter(r => r.status === 'NEW').length },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-dark-900/90 backdrop-blur-2xl border-r border-white/10 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} sticky top-0 h-screen z-40`}>
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-glow-cyan">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <span className="font-black text-white text-base tracking-tight block">ACCESS OPS</span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Live Control Grid</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3.5 space-y-1.5" aria-label="Operator navigation">
          {navItems.map(item => {
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  active ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link to="/app" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Passenger View</span>}
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-dark-900/80 backdrop-blur-2xl border-b border-white/10 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300" aria-label="Toggle sidebar">
              <Menu className="w-4 h-4" />
            </button>
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                    isActive(item.path, item.exact) ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              <StatusDot status={state.isOffline ? 'offline' : 'online'} />
              <span>{state.isOffline ? 'Offline' : 'Real-time Feed'}</span>
            </div>
            {state.demoMode && (
              <Link to="/demo" className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full uppercase">Demo Active</Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
