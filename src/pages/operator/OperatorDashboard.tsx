import React from 'react';
import { useAppStore } from '../../store';
import { Card, MetricCard, Badge, Button } from '../../components/ui';
import { Bus, Clock, Users, Accessibility, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend
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

  const STATUS_DATA = [
    { name: 'Active & Accessible', value: 6 },
    { name: 'Delayed', value: 1 },
    { name: 'Standard (No Ramp)', value: 2 },
  ];
  const COLORS = ['#0e8345', '#f38b00', '#737373'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Fleet Operations Grid</span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mt-0.5">
            Operations Telemetry Command
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/operator/routes">
            <Button size="sm">
              <Activity className="w-4 h-4 mr-1.5" /> Dispatch Condition Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Bus className="w-5 h-5" />} label="Active Fleet Vehicles" value="8" />
        <MetricCard icon={<Accessibility className="w-5 h-5" />} label="Accessible Vehicles" value="6 (75%)" />
        <MetricCard icon={<Clock className="w-5 h-5" />} label="Average Fleet Delay" value="+2.2 min" />
        <MetricCard icon={<ShieldCheck className="w-5 h-5" />} label="Active Safety Sessions" value="1" />
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Crowding Area Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Crowding Density</h3>
              <p className="text-xs text-neutral-500">Hourly occupancy rate across primary corridors</p>
            </div>
            <Badge variant="default">Live Feed</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={crowdingData}>
                <XAxis dataKey="time" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="C2" stroke="#e11900" strokeWidth={2} fill="#fee2e2" name="C2 (Congested)" />
                <Area type="monotone" dataKey="C3" stroke="#0e8345" strokeWidth={2} fill="#d1fae5" name="C3 (Accessible)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delay Bar Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Route Delay (Minutes)</h3>
              <p className="text-xs text-neutral-500">Current schedule variance</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delayData}>
                <XAxis dataKey="route" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} />
                <Tooltip />
                <Bar dataKey="delay" fill="#000000" radius={[4, 4, 0, 0]} name="Delay (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
