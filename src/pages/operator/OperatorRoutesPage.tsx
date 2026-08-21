import React, { useState } from 'react';
import { Button, Card, Badge, Modal, Input, Select } from '../../components/ui';
import { CrowdingIndicator, DelayBadge, VehicleAccessibilityBadge, VehicleStatusBadge } from '../../components/accessibility';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { DEMO_ROUTES, DEMO_CONDITIONS } from '../../data/mock';
import type { Route, TransportCondition, CrowdingLevel, AccessibilityStatus, VehicleStatusType } from '../../types';
import { Edit2 } from 'lucide-react';

export default function OperatorRoutesPage() {
  const { state, updateCondition, addNotification } = useAppStore();
  const { addToast } = useToast();
  
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [editForm, setEditForm] = useState<Partial<TransportCondition>>({});

  const handleEditClick = (route: Route) => {
    const condition = state.transportConditions[route.id] || DEMO_CONDITIONS[route.id];
    setEditingRoute(route);
    setEditForm({
      delay: condition?.delay || 0,
      crowding: condition?.crowding || 'LOW',
      accessibility: condition?.accessibility || 'AVAILABLE',
      vehicleStatus: condition?.vehicleStatus || 'active'
    });
  };

  const handleSave = () => {
    if (!editingRoute || !editForm) return;
    
    updateCondition(editingRoute.id, editForm);
    addNotification({
      id: `notif-${Date.now()}`,
      type: 'route-update',
      title: `${editingRoute.shortName} Status Updated`,
      message: `The transport condition for ${editingRoute.name} has been updated.`,
      routeId: editingRoute.id,
      timestamp: new Date().toISOString(),
      read: false
    });
    addToast('success', `Updated conditions for ${editingRoute.shortName}`);
    setEditingRoute(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Route Conditions</h1>
        <Button variant="outline" size="sm">Refresh Data</Button>
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Vehicle Status</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">Crowding</th>
                <th className="px-4 py-3">Accessibility</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_ROUTES.map(route => {
                const condition = state.transportConditions[route.id] || DEMO_CONDITIONS[route.id] || { 
                  delay: 0, crowding: 'LOW', accessibility: 'AVAILABLE', vehicleStatus: 'active', updatedAt: new Date().toISOString() 
                };
                
                return (
                  <tr key={route.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: route?.color || '#059669' }}>
                          {route?.shortName || 'BUS'}
                        </span>
                        <span>{route?.name || 'Bus Route'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <VehicleStatusBadge status={condition.vehicleStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <DelayBadge delay={condition.delay} />
                    </td>
                    <td className="px-4 py-3">
                      <CrowdingIndicator level={condition.crowding} />
                    </td>
                    <td className="px-4 py-3">
                      <VehicleAccessibilityBadge status={condition.accessibility} />
                    </td>
                    <td className="px-4 py-3">
                      {new Date(condition.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(route)} className="text-indigo-600">
                        <Edit2 size={16} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!editingRoute} onClose={() => setEditingRoute(null)} title={`Edit Conditions: ${editingRoute?.shortName}`}>
        {editingRoute && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (minutes)</label>
              <Input 
                type="number" 
                value={editForm.delay} 
                onChange={(e) => setEditForm({ ...editForm, delay: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crowding Level</label>
              <div className="flex space-x-4">
                {(['LOW', 'MEDIUM', 'HIGH'] as CrowdingLevel[]).map(level => (
                  <label key={level} className="flex items-center">
                    <input 
                      type="radio" 
                      className="mr-2"
                      checked={editForm.crowding === level}
                      onChange={() => setEditForm({ ...editForm, crowding: level })}
                    />
                    <span className="text-sm">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Status</label>
              <div className="flex space-x-4">
                {(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as AccessibilityStatus[]).map(status => (
                  <label key={status} className="flex items-center">
                    <input 
                      type="radio" 
                      className="mr-2"
                      checked={editForm.accessibility === status}
                      onChange={() => setEditForm({ ...editForm, accessibility: status })}
                    />
                    <span className="text-sm">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Status</label>
              <Select 
                value={editForm.vehicleStatus} 
                onChange={(e) => setEditForm({ ...editForm, vehicleStatus: e.target.value as VehicleStatusType })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'delayed', label: 'Delayed' },
                  { value: 'out-of-service', label: 'Out of Service' }
                ]}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setEditingRoute(null)}>Cancel</Button>
              <Button onClick={handleSave}>Publish Update</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
