import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, MapPin, History, Bell, User, Menu, X, Wifi, WifiOff,
  Settings, ChevronRight, Accessibility, Shield, LogOut, Bus
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
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
    { path: '/plan', icon: MapPin, label: 'Plan Trip' },
    { path: '/journeys', icon: History, label: 'Journeys' },
    { path: '/notifications', icon: Bell, label: 'Alerts', badge: unreadCount },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => location.pathname === path || (path !== '/app' && location.pathname.startsWith(path));

  return (
    <div className={`min-h-screen bg-gray-50 ${state.accessibilitySettings.largerText ? 'text-lg' : ''} ${state.accessibilitySettings.highContrast ? 'contrast-more' : ''}`}>
      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-100 px-6 h-16 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="ACCESS Home">
          <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center">
            <Accessibility className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-navy-900 text-lg tracking-tight">ACCESS</span>
            <span className="hidden lg:block text-[10px] text-navy-500 -mt-1 leading-tight">Accessible Transport</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
                isActive(item.path) ? 'bg-navy-50 text-navy-900' : 'text-navy-500 hover:text-navy-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-access-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" aria-label={`${item.badge} unread`}>
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-navy-500">
            {state.isOffline ? <WifiOff className="w-3.5 h-3.5 text-gray-400" /> : <Wifi className="w-3.5 h-3.5 text-access-green" />}
            <StatusDot status={state.isOffline ? 'offline' : 'online'} />
            <span>{state.isOffline ? 'Offline' : 'Online'}</span>
          </div>

          {state.demoMode && (
            <Link to="/demo" className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Demo
            </Link>
          )}

          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Accessibility settings"
          >
            <Settings className="w-4 h-4 text-navy-500" />
          </button>

          <button
            onClick={() => navigate('/operator')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-navy-600 hover:bg-navy-50 border border-navy-200 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            Operator
          </button>
        </div>
      </header>

      {/* Accessibility Settings Dropdown */}
      {settingsOpen && (
        <div className="hidden md:block absolute right-6 top-[68px] z-50 bg-white rounded-2xl shadow-elevated border border-gray-100 p-4 w-64 motion-safe:animate-slide-up">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Accessibility Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.accessibilitySettings.largerText}
                onChange={(e) => setAccessibilitySettings({ largerText: e.target.checked })}
                className="rounded border-navy-300 text-navy-900 focus:ring-navy-500"
              />
              <span className="text-sm text-navy-700">Larger text</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.accessibilitySettings.highContrast}
                onChange={(e) => setAccessibilitySettings({ highContrast: e.target.checked })}
                className="rounded border-navy-300 text-navy-900 focus:ring-navy-500"
              />
              <span className="text-sm text-navy-700">High contrast</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.accessibilitySettings.reducedMotion}
                onChange={(e) => setAccessibilitySettings({ reducedMotion: e.target.checked })}
                className="rounded border-navy-300 text-navy-900 focus:ring-navy-500"
              />
              <span className="text-sm text-navy-700">Reduced motion</span>
            </label>
          </div>
        </div>
      )}

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 h-14 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center">
            <Accessibility className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-navy-900">ACCESS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative p-2" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
            <Bell className="w-5 h-5 text-navy-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-access-red rounded-full" />
            )}
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2" aria-label="Open menu">
            <Menu className="w-5 h-5 text-navy-600" />
          </button>
        </div>
      </header>

      {/* Mobile Slide Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-modal p-5 motion-safe:animate-slide-in-right">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-navy-900">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X className="w-5 h-5 text-navy-500" /></button>
            </div>
            <nav className="space-y-1" aria-label="Mobile navigation">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive(item.path) ? 'bg-navy-50 text-navy-900' : 'text-navy-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.badge ? <span className="ml-auto bg-access-red text-white text-xs px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
                  <ChevronRight className="w-4 h-4 ml-auto text-gray-300" />
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <Link to="/operator" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 hover:bg-gray-50">
                <Shield className="w-4 h-4" />Operator View
              </Link>
              <Link to="/modules" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-600 hover:bg-gray-50">
                <Settings className="w-4 h-4" />Modules
              </Link>
              {state.demoMode && (
                <Link to="/demo" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50">
                  <Settings className="w-4 h-4" />Demo Center
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around h-16 z-40" aria-label="Bottom navigation">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium relative ${
              isActive(item.path) ? 'text-navy-900' : 'text-navy-400'
            }`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="absolute -top-0.5 right-0.5 min-w-[16px] h-[16px] bg-access-red text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {/* Offline Banner */}
      {state.isOffline && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-gray-800 text-white text-sm text-center py-2 z-30" role="alert">
          <WifiOff className="w-4 h-4 inline mr-2" />
          You're offline. Some live transport information may be unavailable.
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
    { path: '/operator', icon: Home, label: 'Overview', exact: true },
    { path: '/operator/routes', icon: MapPin, label: 'Routes' },
    { path: '/operator/vehicles', icon: Bus, label: 'Vehicles' },
    { path: '/operator/conditions', icon: Settings, label: 'Conditions' },
    { path: '/operator/reports', icon: History, label: 'Reports', badge: state.reports.filter(r => r.status === 'NEW').length },
    { path: '/operator/alerts', icon: Bell, label: 'Alerts' },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-navy-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'} sticky top-0 h-screen`}>
        <div className="p-4 flex items-center gap-3 border-b border-navy-800">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-access-green" />
          </div>
          {sidebarOpen && (
            <div>
              <span className="font-bold text-sm">ACCESS</span>
              <span className="block text-[10px] text-navy-300">Operations</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1" aria-label="Operator navigation">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                isActive(item.path, item.exact) ? 'bg-white/10 text-white' : 'text-navy-300 hover:text-white hover:bg-white/5'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-access-red text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-navy-800">
          <Link to="/app" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-navy-300 hover:text-white hover:bg-white/5 transition-colors">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Passenger View</span>}
          </Link>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100" aria-label="Toggle sidebar">
              <Menu className="w-4 h-4 text-navy-500" />
            </button>
            {/* Mobile operator nav */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive(item.path, item.exact) ? 'bg-navy-50 text-navy-900' : 'text-navy-500 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-navy-500">
              <StatusDot status={state.isOffline ? 'offline' : 'online'} />
              {state.isOffline ? 'Offline' : 'Online'}
            </div>
            {state.demoMode && (
              <Link to="/demo" className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase">Demo</Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
