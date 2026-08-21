import React, { useState } from 'react';
import { Card, Tabs, Select, Badge } from '../../components/ui';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { DEMO_REPORTS } from '../../data/mock';
import type { ReportStatus, ReportType } from '../../types';
import { AlertTriangle, Clock, Users, Accessibility, MessageSquare, MapPin } from 'lucide-react';

export default function OperatorReportsPage() {
  const { state, updateReportStatus } = useAppStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Combine store reports with demo reports, preferring store
  const allReports = [...state.reports, ...DEMO_REPORTS.filter(dr => !state.reports.find(sr => sr.id === dr.id))]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredReports = activeTab === 'all' 
    ? allReports 
    : allReports.filter(r => r.type === activeTab);

  const handleStatusChange = (reportId: string, status: ReportStatus) => {
    updateReportStatus(reportId, status);
    addToast('info', `Report marked as ${status}`);
  };

  const getIcon = (type: ReportType) => {
    switch (type) {
      case 'crowding': return <Users size={20} className="text-blue-500" />;
      case 'delay': return <Clock size={20} className="text-amber-500" />;
      case 'accessibility': return <Accessibility size={20} className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Reports</h1>
      
      <Tabs 
        tabs={[
          { id: 'all', label: 'All Reports' },
          { id: 'crowding', label: 'Crowding' },
          { id: 'delay', label: 'Delays' },
          { id: 'accessibility', label: 'Accessibility' },
        ]} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <div className="grid grid-cols-1 gap-4">
        {filteredReports.map(report => (
          <Card key={report.id} className="p-5 flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${report.type === 'accessibility' ? 'bg-purple-100' : report.type === 'delay' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {getIcon(report.type)}
            </div>
            
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg capitalize">{report.type} Report</h3>
                  <Badge variant={report.status === 'NEW' ? 'danger' : report.status === 'REVIEWED' ? 'warning' : 'success'}>
                    {report.status}
                  </Badge>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(report.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm text-gray-700">
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="font-medium">{report.routeName || report.routeId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={16} className="text-gray-400" />
                  <span>Reported by: {report.reportedBy}</span>
                </div>
              </div>

              {(report.delayMinutes || report.crowding || report.accessibilityIssue) && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                  {report.delayMinutes && <p><strong>Delay:</strong> {report.delayMinutes} minutes</p>}
                  {report.crowding && <p><strong>Crowding:</strong> {report.crowding}</p>}
                  {report.accessibilityIssue && <p><strong>Issue:</strong> {report.accessibilityIssue}</p>}
                </div>
              )}

              {report.comment && (
                <div className="flex items-start space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">
                  <MessageSquare size={16} className="flex-shrink-0 mt-0.5 text-gray-400" />
                  <p>"{report.comment}"</p>
                </div>
              )}
            </div>
            
            <div className="w-full md:w-48 flex-shrink-0 mt-4 md:mt-0">
              <label className="block text-xs font-medium text-gray-500 mb-1">Update Status</label>
              <Select 
                value={report.status}
                onChange={(e) => handleStatusChange(report.id, e.target.value as ReportStatus)}
                options={[
                  { value: 'NEW', label: 'New' },
                  { value: 'REVIEWED', label: 'Under Review' },
                  { value: 'RESOLVED', label: 'Resolved' }
                ]}
              />
            </div>
          </Card>
        ))}
        
        {filteredReports.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
            No reports found.
          </div>
        )}
      </div>
    </div>
  );
}
