import React from 'react';
import { useAppStore } from '../../store';
import { Card, Badge } from '../../components/ui';
import { MapPin, Clock, Calendar, ChevronRight } from 'lucide-react';
import { RadialScore } from '../../components/ui';

const JourneyHistoryPage: React.FC = () => {
  const { state } = useAppStore();
  const { journeyHistory } = state;

  if (!journeyHistory || journeyHistory.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Clock className="w-16 h-16 text-gray-300 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-900">No Journey History</h2>
        <p className="text-gray-500">Your past trips will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Journey History</h1>
        <p className="text-gray-500">Review your past trips and ratings</p>
      </div>

      <div className="space-y-4">
        {journeyHistory.map(journey => (
          <Card key={journey.id} className="p-0 hover:shadow-md transition-shadow">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{journey.originName}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{journey.destinationName}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {journey.startedAt ? new Date(journey.startedAt).toLocaleDateString() : 'Unknown Date'}</span>
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {journey.duration} mins</span>
                    <Badge variant={journey.status === 'completed' ? 'success' : 'neutral'} className="capitalize">
                      {journey.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Match Score</div>
                  <RadialScore score={journey.scores.overall} size="sm" />
                </div>
                <button className="text-sm font-medium text-primary-600 hover:text-primary-700">View Details</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JourneyHistoryPage;
