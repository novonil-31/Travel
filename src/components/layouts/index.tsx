import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store';
import {
  Compass, MapPin, Shield, Layers, Activity, User, LogIn, ChevronRight, Bus
} from 'lucide-react';

export function PassengerLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { state } = useAppStore();

  const navItems = [
    { label: 'Find a trip', path: '/plan' },
    { label: 'Live Map & HUD', path: '/app' },
    { label: 'Transit Modules', path: '/modules' },
    { label: 'Fleet Operator', path: '/operator' },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      {/* Uber Black Navbar */}
      <header className="sticky top-0 z-40 bg-black text-white px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Uber Brand Logo */}
          <Link to="/" className="text-2xl sm:text-3xl font-black tracking-tight text-white hover:opacity-90 transition-opacity">
            ACCESS
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-semibold transition-colors ${
                    active ? 'text-white underline underline-offset-8 decoration-2' : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {item.label}
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
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
                {state.currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{state.currentUser.name.split(' ')[0]}</span>
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
      <header className="md:hidden flex items-center justify-between bg-black text-white px-4 h-14 sticky top-0 z-40">
        <Link to="/" className="font-black text-white text-xl tracking-tighter">
          ACCESS
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
                <span className="font-black text-xl tracking-tight text-neutral-900">ACCESS</span>
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

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden sticky bottom-0 z-40 bg-white border-t border-neutral-200 px-4 py-2.5 flex justify-around shadow-lg">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs font-bold transition-colors ${
                active ? 'text-black underline underline-offset-4' : 'text-neutral-500'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function OperatorLayout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();

  const links = [
    { label: 'Fleet Overview', path: '/operator' },
    { label: 'Route Dispatch', path: '/operator/routes' },
    { label: 'Live Vehicles', path: '/operator/vehicles' },
    { label: 'Incident Reports', path: '/operator/reports' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-black text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span>ACCESS Fleet Operator</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-4">
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-xs font-bold transition-all ${
                    active ? 'text-white underline underline-offset-4' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Link to="/" className="text-xs font-bold text-neutral-300 hover:text-white">
          Exit to Passenger App →
        </Link>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children || <Outlet />}</main>
    </div>
  );
}
