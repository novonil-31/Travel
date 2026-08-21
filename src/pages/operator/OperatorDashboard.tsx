import React from 'react';
import { useAppStore } from '../../store';
import { Card, MetricCard, Badge, Button } from '../../components/ui';
import { Bus, Clock, Users, Accessibility, AlertTriangle, ShieldCheck, ArrowUpRight, Activity } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Link } from 'react-router-dom';

export default function OperatorDashboard() {
  const { state } = useAppStore();

  const crowdingData = [
    { time: '08:00', C3: 20, C2: 45, C5: 30 },
    { time: '10:00', C3: 35, C2: 70, C5: 55 },
    { time: '12:00', C3: 25, C2: 60, C5: 40 },
    { time: '14:00', C3: 40, C2: 85, C5: 65 },
    { time: '16:00', C3: 30, C2: 50, C5: 45 },
    { time: '18:00', C3: 50, C2: 90, C5: 80 },
    { time: '20:00', C3: 15, C2: 30, C5: 25 },
  ];

  const delayData = [
    { route: 'C3', delay: 0 },
    { route: 'C2', delay: 8 },
    { route: 'C5', delay: 3 },
    { route: 'S1', delay: 0 },
    { route: 'CV1', delay: 0 },
  ];

  const fleetStatus = [
    { name: 'Active & Accessible', value: 6, color: '#10b981' },
    { name: 'Delayed', value: 1, color: '#f59e0b' },
    { name: 'Standard (No Ramp)', value: 2, color: '#64748b' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Live Grid Dispatch System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Operations Telemetry Command
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/operator/routes">
            <Button variant="primary" size="sm" className="shadow-glow-cyan">
              <Activity className="w-4 h-4 mr-1.5" /> Dispatch Condition Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Bus className="w-5 h-5" />} label="Active Fleet Vehicles" value="8" variant="default" />
        <MetricCard icon={<Accessibility className="w-5 h-5" />} label="Accessible Vehicles" value="6 (75%)" variant="success" />
        <MetricCard icon={<Clock className="w-5 h-5" />} label="Average Fleet Delay" value="+2.2 min" variant="warning" />
        <MetricCard icon={<ShieldCheck className="w-5 h-5" />} label="Active Safety Sessions" value="1" variant="success" />
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Crowding Area Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-dark-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crowding Density Waveform</h3>
              <p className="text-xs text-slate-400">Hourly occupancy rate across primary campus corridors</p>
            </div>
            <Badge variant="info">Live Feed</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={crowdingData}>
                <defs>
                  <linearGradient id="colorC2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorC3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070f1e', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '1rem', color: '#fff' }}
                />
                <Area type="monotone" dataKey="C2" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorC2)" name="C2 (Congested)" />
                <Area type="monotone" dataKey="C3" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorC3)" name="C3 (Accessible)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delay Bar Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-dark-900/80 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Route Delay (Minutes)</h3>
              <p className="text-xs text-slate-400">Current schedule variance</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayData}>
                <XAxis dataKey="route" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#070f1e', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '1rem', color: '#fff' }}
                />
                <Bar dataKey="delay" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Delay (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
