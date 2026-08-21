import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Button, Select, Toggle } from '../../components/ui';
import { DEMO_STOPS, generateDemoSearchResults } from '../../data/mock';
import { Navigation, MapPin, ArrowDown, Settings } from 'lucide-react';

const TripPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSearchResults, state } = useAppStore();
  
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [useProfile, setUseProfile] = useState(true);

  const handleSearch = () => {
    if (!origin || !destination) return;
    const results = generateDemoSearchResults(origin, destination);
    setSearchResults(results);
    navigate('/routes');
  };

  const stopOptions = [
    { value: '', label: 'Select a location...' },
    ...DEMO_STOPS.map(stop => ({ value: stop.name, label: stop.name }))
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Journey</h1>
        <p className="text-gray-500">Find the best route tailored to your needs</p>
      </div>

      <Card className="p-6 md:p-8 shadow-lg border-primary-100">
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-gray-200 z-0"></div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                </div>
                <div className="flex-1">
                  <Select 
                    value={origin} 
                    onChange={e => setOrigin(e.target.value)} 
                    options={stopOptions} 
                    className="w-full text-lg" 
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <Select 
                    value={destination} 
                    onChange={e => setDestination(e.target.value)} 
                    options={stopOptions} 
                    className="w-full text-lg" 
                  />
                </div>
              </div>
            </div>
            
            <div className="absolute left-8 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20">
              <button className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-primary-600">
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-900">Apply Accessibility Profile</div>
                  <div className="text-xs text-gray-500">Optimize routes based on your preferences</div>
                </div>
              </div>
              <Toggle label="Use My Accessibility Profile" checked={useProfile} onChange={() => setUseProfile(!useProfile)} />
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg h-14 bg-primary-600 hover:bg-primary-700" 
            onClick={handleSearch}
            disabled={!origin || !destination || origin === destination}
          >
            <Navigation className="w-5 h-5 mr-2" /> Find Best Routes
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TripPlannerPage;
