import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Card, Badge, Tabs } from '../../components/ui';
import { Bell, Clock, Users, Accessibility, Shield, Info, Check } from 'lucide-react';
import type { NotificationType } from '../../types';

const NotificationsPage: React.FC = () => {
  const { state, markNotificationRead } = useAppStore();
  const { notifications } = state;
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Journey', 'Delay', 'Crowding', 'Accessibility', 'Safety', 'System'];

  const filtered = activeTab === 'All' 
    ? notifications 
    : notifications.filter(n => n.type.toLowerCase() === activeTab.toLowerCase() || (activeTab === 'System' && n.type === 'route-update'));

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'delay': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'crowding': return <Users className="w-5 h-5 text-purple-500" />;
      case 'accessibility': return <Accessibility className="w-5 h-5 text-blue-500" />;
      case 'safety': return <Shield className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6" /> Notifications
          </h1>
          <p className="text-gray-500">Updates and alerts for your journeys</p>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto pb-2">
        <Tabs 
          tabs={tabs.map(t => ({ id: t, label: t }))} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="text-gray-500">No new notifications in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notification => (
            <Card 
              key={notification.id} 
              className={`p-4 transition-colors ${!notification.read ? 'bg-primary-50 border-primary-100' : 'bg-white opacity-80'}`}
              onClick={() => !notification.read && markNotificationRead(notification.id)}
            >
              <div className="flex items-start gap-4 cursor-pointer">
                <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  
                  {notification.actionUrl && (
                    <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                      {notification.actionLabel || 'View Details'}
                    </button>
                  )}
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 text-primary-600 self-center">
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
