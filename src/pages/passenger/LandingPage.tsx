import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, User, Accessibility, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Accessibility className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">ACCESS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/app" className="text-gray-600 hover:text-gray-900 font-medium text-sm">Dashboard</Link>
            <Link to="/demo">
              <Button variant="outline" size="sm">Try Demo</Button>
            </Link>
            <Link to="/plan">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-transparent">Plan Journey</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-slate-900 text-white py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Not the fastest route. <br />
              <span className="text-green-400">The BEST route for YOU.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mb-10">
              Personalized public transport routing that prioritizes your accessibility needs, safety preferences, and comfort.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/plan">
                <Button size="lg" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-slate-900 font-bold border-transparent text-lg px-8">
                  Plan a Journey <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-slate-600 hover:bg-slate-800 text-lg px-8">
                  Try Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why choose ACCESS?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">We look beyond just time and distance to find routes that actually work for you.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Accessibility, title: 'Personalized Accessibility', desc: 'Routes tailored to your mobility, vision, and hearing needs.' },
                { icon: Shield, title: 'Safety First', desc: 'Real-time safety check-ins and routes prioritizing well-lit, secure paths.' },
                { icon: Activity, title: 'Live Conditions', desc: 'Up-to-the-minute data on elevator status, vehicle crowding, and delays.' },
                { icon: User, title: 'Your Preferences', desc: 'Tell us what you care about, and we’ll find the best match.' }
              ].map((feature, i) => (
                <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 py-12 border-t border-slate-800 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <Accessibility className="w-6 h-6 text-green-400" />
            <span className="text-lg font-bold tracking-tight">ACCESS</span>
          </div>
          <p className="text-sm">© 2026 ACCESS Transit System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
