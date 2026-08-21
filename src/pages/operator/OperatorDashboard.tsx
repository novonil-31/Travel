import React from 'react';
import { MetricCard, Card } from '../../components/ui';
import { Activity, AlertTriangle, Clock, ShieldAlert, Truck, Users } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '../../store';

const CROWDING_DATA = [
  { time: '06:00', level: 20 },
  { time: '07:00', level: 45 },
  { time: '08:00', level: 85 },
  { time: '09:00', level: 90 },
  { time: '10:00', level: 60 },
  { time: '11:00', level: 40 },
  { time: '12:00', level: 55 }
];

const DELAY_DATA = [
  { route: 'C1', delay: 5 },
  { route: 'C2', delay: 12 },
  { route: 'C3', delay: 2 },
  { route: 'L1', delay: 0 },
  { route: 'L2', delay: 25 }
];

const STATUS_DATA = [
  { name: 'On Time', value: 45 },
  { name: 'Delayed', value: 12 },
  { name: 'Out of Service', value: 3 }
];
const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function OperatorDashboard() {
  const { state } = useAppStore();
  const activeAlerts = state.reports.filter(r => r.status === 'NEW').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Active Routes" value="12" icon={<Activity size={20} />} trend="neutral" />
        <MetricCard label="Active Vehicles" value="45" icon={<Truck size={20} />} trend="up" />
        <MetricCard label="Total Delays" value="15m" icon={<Clock size={20} />} trend="down" />
        <MetricCard label="Crowding Alerts" value="4" icon={<Users size={20} />} trend="up" />
        <MetricCard label="Access. Issues" value="2" icon={<AlertTriangle size={20} />} trend="up" />
        <MetricCard label="Safety Sessions" value={state.activeJourney?.safetySession ? '1' : '0'} icon={<ShieldAlert size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Crowding Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CROWDING_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Delays by Route</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DELAY_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="route" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="delay" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 col-span-1 lg:col-span-1">
          <h3 className="text-lg font-medium mb-4">Network Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={STATUS_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {STATUS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Recent Alerts</h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">{activeAlerts} New</span>
          </div>
          <div className="space-y-4">
            {state.reports.slice(0, 4).map(report => (
              <div key={report.id} className="flex items-start p-3 border rounded-lg bg-gray-50">
                <AlertTriangle className={`mt-0.5 mr-3 ${report.type === 'accessibility' ? 'text-purple-500' : report.type === 'delay' ? 'text-amber-500' : 'text-blue-500'}`} size={16} />
                <div>
                  <p className="font-medium text-sm text-gray-900">{report.routeName || report.routeId} - {report.type.charAt(0).toUpperCase() + report.type.slice(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">{report.comment || 'System alert triggered'}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(report.timestamp || report.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))}
            {state.reports.length === 0 && <p className="text-gray-500 text-sm italic">No recent alerts.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
