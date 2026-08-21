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

        {/* Right CTA */}
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs sm:text-sm font-bold text-white hover:text-neutral-300 px-3 py-2"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold transition-all"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto">
        {children || <Outlet />}
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
