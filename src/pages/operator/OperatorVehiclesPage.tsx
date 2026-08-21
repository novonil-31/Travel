import React, { useState } from 'react';
import { Card, Input, Badge } from '../../components/ui';
import { VehicleStatusBadge } from '../../components/accessibility';
import { DEMO_VEHICLES, DEMO_ROUTES } from '../../data/mock';
import { Truck, Users, ArrowRight } from 'lucide-react';

export default function OperatorVehiclesPage() {
  const [filter, setFilter] = useState('');

  const filteredVehicles = DEMO_VEHICLES.filter(v => 
    v.name.toLowerCase().includes(filter.toLowerCase()) ||
    v.routeId.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <div className="w-full sm:w-64">
          <Input 
            placeholder="Search vehicles or routes..." 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map(vehicle => {
          const route = DEMO_ROUTES.find(r => r.id === vehicle.routeId);
          
          return (
            <Card key={vehicle.id} className="p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Truck className="text-gray-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{vehicle.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
                  </div>
                </div>
                <VehicleStatusBadge status={vehicle.status} />
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Assigned Route</p>
                  <div className="flex items-center space-x-2 font-medium">
                    {route && (
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: route?.color || '#059669' }}>
                        {route.shortName}
                      </span>
                    )}
                    <span>{route ? route.name : vehicle.routeId}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Capacity</p>
                  <div className="flex items-center space-x-1 font-medium">
                    <Users size={16} className="text-gray-400" />
                    <span>{vehicle.capacity}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {vehicle.accessible && <Badge variant="success">Accessible</Badge>}
                {vehicle.hasRamp && <Badge variant="info">Has Ramp</Badge>}
                {vehicle.hasLowFloor && <Badge variant="info">Low Floor</Badge>}
              </div>
            </Card>
          );
        })}
      </div>
      
      {filteredVehicles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No vehicles found matching "{filter}"
        </div>
      )}
    </div>
  );
}
