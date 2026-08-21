import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, Button } from '../../components/ui';
import { DEMO_MODULES } from '../../data/modules';
import { ArrowLeft, Server, Code, FileText, CheckCircle } from 'lucide-react';

export default function ModuleDetailPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = DEMO_MODULES.find(m => m.id === moduleId);

  if (!module) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">Module not found</h2>
        <Link to="/modules" className="text-indigo-600 hover:underline mt-4 inline-block">Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <Link to="/modules" className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to Modules
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.name}</h1>
            <p className="text-xl text-gray-600">{module.description}</p>
          </div>
          <Badge variant={module.status === 'CONNECTED' ? 'success' : 'default'} className="text-sm px-3 py-1">
            {module.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FileText className="mr-2 text-indigo-500" /> Overview
            </h2>
            <div className="prose prose-indigo">
              <h3 className="text-lg font-medium">The Problem</h3>
              <p className="text-gray-600 text-sm mb-4">
                Traditional transit systems provide a one-size-fits-all approach to routing, which fails users with specific mobility needs. Standard APIs only consider time and distance, ignoring critical factors like stairs, crowding, and elevator outages.
              </p>
              
              <h3 className="text-lg font-medium">How it works</h3>
              <p className="text-gray-600 text-sm">
                This module seamlessly integrates with your existing GTFS data and routing engine. It acts as an intelligent middleware layer, intercepting routing requests, applying personalized user profile constraints, and re-ranking options based on true accessibility scoring before returning results to the client.
              </p>
            </div>
          </Card>

          {module.endpoints && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Server className="mr-2 text-indigo-500" /> API Reference
              </h2>
              <div className="space-y-6">
                {module.endpoints.map((ep: { method?: string; path?: string; description?: string }, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center mb-2">
                      <span className={`font-mono font-bold text-sm px-2 py-1 rounded mr-3 ${ep.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-gray-900">{ep.path}</span>
                    </div>
                    <p className="text-sm text-gray-600">{ep.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6 bg-gray-900 text-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
              <Code className="mr-2 text-indigo-400" /> Example Integration
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Request (POST {module.endpoints?.[0]?.path || '/api/example'})</p>
                <pre className="bg-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto text-green-400">
{`{
  "userId": "usr_94812",
  "origin": { "lat": 40.7128, "lng": -74.0060 },
  "destination": { "lat": 40.7580, "lng": -73.9855 },
  "profile": {
    "wheelchair": true,
    "maxWalkingDistance": 200,
    "stairs": "AVOID"
  }
}`}
                </pre>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Module Details</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Version</span>
                <span className="font-medium">{module.version || '1.0.0'}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium">{module.provider || 'ACCESS Core'}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Complexity</span>
                <span className="font-medium">{module.complexity || 'Medium'}</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Format</span>
                <span className="font-medium">{module.format || 'REST API / JSON'}</span>
              </li>
            </ul>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Integration Steps</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Request API keys
                </li>
                <li className="flex items-start">
                  <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Map user profiles to ACCESS schema
                </li>
                <li className="flex items-start">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2 mt-0.5 flex-shrink-0"></div>
                  Implement webhook listeners
                </li>
                <li className="flex items-start">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2 mt-0.5 flex-shrink-0"></div>
                  Test in sandbox environment
                </li>
              </ul>
            </div>
            
            <Button className="w-full mt-6" disabled={module.status === 'CONNECTED'}>
              {module.status === 'CONNECTED' ? 'Manage Integration' : 'Start Integration'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
