import React from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { DEMO_MODULES } from '../../data/modules';
import { Shield, Accessibility, Users, Map, Activity, Bell, Mic, Database, ArrowRight, CheckCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Shield': return <Shield className="text-indigo-500" size={32} />;
    case 'Accessibility': return <Accessibility className="text-blue-500" size={32} />;
    case 'Users': return <Users className="text-green-500" size={32} />;
    case 'Map': return <Map className="text-gray-400" size={24} />;
    case 'Activity': return <Activity className="text-gray-400" size={24} />;
    case 'Bell': return <Bell className="text-gray-400" size={24} />;
    case 'Mic': return <Mic className="text-gray-400" size={24} />;
    case 'Database': return <Database className="text-gray-400" size={24} />;
    default: return <Database className="text-gray-400" size={24} />;
  }
};

export default function ModuleMarketplacePage() {
  const coreModules = DEMO_MODULES.filter(m => m.type === 'core');
  const availableModules = DEMO_MODULES.filter(m => m.type === 'available');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="text-center py-10 bg-indigo-900 text-white rounded-xl shadow-lg mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">ACCESS MODULES</h1>
        <p className="text-indigo-100 text-lg max-w-2xl mx-auto">
          Extend your transport network capabilities with specialized, plug-and-play modules designed for true accessibility.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="text-green-500 mr-2" /> 
          Active Core Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreModules.map(module => (
            <Card key={module.id} className="p-6 flex flex-col h-full hover:shadow-xl transition-shadow border-t-4 border-t-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  {getIcon(module.icon || '')}
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <h3 className="text-xl font-bold mb-2">{module.name}</h3>
              <p className="text-gray-600 mb-6 flex-grow">{module.description}</p>
              
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Key API Endpoints</p>
                <div className="space-y-2">
                  {module.endpoints?.slice(0, 3).map((ep: { method?: string; path?: string; description?: string }, i: number) => (
                    <div key={i} className="flex items-center text-sm">
                      <span className={`font-mono text-xs px-1.5 py-0.5 rounded mr-2 ${ep.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {ep.method}
                      </span>
                      <span className="text-gray-600 truncate font-mono text-xs">{ep.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-4 border-t flex justify-between items-center">
                <span className="text-xs text-gray-500 flex items-center">
                  Complexity: <span className="font-semibold ml-1">{module.complexity}</span>
                </span>
                <Link to={`/modules/${module.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
                  View Module <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Integration Center</h2>
        <Card className="p-8 bg-gray-50 border-dashed border-2 border-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {coreModules.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm border border-green-200 flex flex-col items-center text-center">
                <div className="mb-2">{getIcon(m.icon || '')}</div>
                <span className="font-medium text-sm">{m.name}</span>
                <span className="text-xs text-green-600 mt-1 font-medium">Installed</span>
              </div>
            ))}
            
            {availableModules.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-lg border border-dashed border-gray-300 flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="mb-2">{getIcon(m.icon || '')}</div>
                <span className="font-medium text-sm text-gray-600">{m.name}</span>
                <Button variant="ghost" size="sm" className="mt-2 text-xs">
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
