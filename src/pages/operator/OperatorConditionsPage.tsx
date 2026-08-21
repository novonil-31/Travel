import React from 'react';
import { Card } from '../../components/ui';
import { useAppStore } from '../../store';
import { DEMO_ROUTES, DEMO_CONDITIONS } from '../../data/mock';
import { CrowdingIndicator, DelayBadge, VehicleAccessibilityBadge, VehicleStatusBadge, LastUpdated } from '../../components/accessibility';
import { Activity } from 'lucide-react';

export default function OperatorConditionsPage() {
  const { state } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Network Conditions Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DEMO_ROUTES.map(route => {
          const condition = state.transportConditions[route.id] || DEMO_CONDITIONS[route.id] || { 
            delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() 
          };

          return (
            <Card key={route.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: route?.color || '#059669' }}>
                  {route?.shortName || 'BUS'}
                </span>
                <div className="flex-1 truncate">
                  <h3 className="font-bold text-gray-900 truncate">{route?.name || 'Bus Route'}</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Activity size={12} className="mr-1" />
                    <LastUpdated timestamp={condition.updatedAt} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <VehicleStatusBadge status={condition.vehicleStatus} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Delay</span>
                  <DelayBadge delay={condition.delay} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Crowding</span>
                  <CrowdingIndicator level={condition.crowding} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Accessibility</span>
                  <VehicleAccessibilityBadge status={condition.accessibility} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
