import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Badge } from '../../components/ui';
import { ProfileBadges, SafetyStatusBadge, DelayBadge, CrowdingIndicator, VehicleAccessibilityBadge, LastUpdated } from '../../components/accessibility';
import { MapPin, Navigation, ArrowRight, Clock, AlertTriangle, Bus } from 'lucide-react';
import { DEMO_CONDITIONS } from '../../data/mock';

const HomePage: React.FC = () => {
  const { state } = useAppStore();
  const { currentUser, accessibilityProfile, activeJourney, journeyHistory } = state;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good afternoon, {currentUser?.name || 'Traveler'}</h1>
          <p className="text-gray-500">Here's your transit overview for today.</p>
        </div>
        <Link to="/plan">
          <Button className="w-full md:w-auto"><Navigation className="w-4 h-4 mr-2" /> Plan New Journey</Button>
        </Link>
      </div>

      {accessibilityProfile && (
        <Card className="p-4 bg-primary-50 border-primary-100 flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto">
            <span className="text-sm font-medium text-primary-900 whitespace-nowrap">Active Profile:</span>
            <ProfileBadges profile={accessibilityProfile} />
          </div>
          <Link to="/profile" className="text-sm text-primary-700 hover:text-primary-800 font-medium whitespace-nowrap ml-4">
            Edit
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeJourney && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Navigation className="w-5 h-5 mr-2 text-primary-600" /> Active Journey</h2>
              <Card className="p-6 border-l-4 border-l-primary-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span>{activeJourney.originName}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-medium text-gray-900">{activeJourney.destinationName}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{activeJourney.routeName}</h3>
                  </div>
                  <Badge variant="info" className="animate-pulse">In Progress</Badge>
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">ETA</span>
                    <span className="font-semibold text-gray-900">{activeJourney.eta || '--:--'}</span>
                  </div>
                  {activeJourney.safetySession && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Safety</span>
                      <SafetyStatusBadge status={activeJourney.safetySession.status} />
                    </div>
                  )}
                  <Link to={`/journey/${activeJourney.id}`} className="ml-auto">
                    <Button variant="outline" size="sm">View Live <ArrowRight className="w-4 h-4 ml-2" /></Button>
                  </Link>
                </div>
              </Card>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center"><Clock className="w-5 h-5 mr-2 text-gray-600" /> Recent Journeys</h2>
              <Link to="/journeys" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</Link>
            </div>
            <div className="space-y-4">
              {journeyHistory?.slice(0, 3).map(journey => (
                <Card key={journey.id} className="p-4 hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{journey.destinationName}</div>
                        <div className="text-xs text-gray-500">{new Date(journey.startedAt || '').toLocaleDateString()} • {journey.routeName}</div>
                      </div>
                    </div>
                    <Badge variant="neutral" className="capitalize">{journey.status}</Badge>
                  </div>
                </Card>
              ))}
              {(!journeyHistory || journeyHistory.length === 0) && (
                <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">No recent journeys</div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-amber-500" /> Live Transport Conditions</h2>
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {Object.entries(state.transportConditions && Object.keys(state.transportConditions).length > 0 ? state.transportConditions : DEMO_CONDITIONS).map(([routeId, cond], i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-navy-700" />
                        <span className="font-semibold text-navy-900">Route {routeId}</span>
                      </div>
                      <LastUpdated timestamp={cond.updatedAt} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DelayBadge delay={cond.delay} />
                      <CrowdingIndicator level={cond.crowding} />
                      <VehicleAccessibilityBadge status={cond.accessibility} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
