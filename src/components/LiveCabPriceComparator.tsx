import React, { useState, useEffect } from 'react';
import type { LiveCabComparisonResult, LiveCabOption } from '../api';
import { faresApi } from '../api';
import { ExternalLink, RefreshCw, MapPin, CheckCircle2 } from 'lucide-react';
import { launchMobileAppOrWeb, requestAccurateUserLocation, sanitizeFallbackUrl } from '../utils/mobileAppLauncher';

interface LiveCabPriceComparatorProps {
  pickupLat: number;
  pickupLng: number;
  pickupName: string;
  dropLat: number;
  dropLng: number;
  dropName: string;
  initialCategory?: 'all' | 'cab' | 'auto' | 'bike' | 'carpool';
  onClose?: () => void;
  compact?: boolean;
  onOpenCarpool?: () => void;
}

export const LiveCabPriceComparator: React.FC<LiveCabPriceComparatorProps> = ({
  pickupLat: initialPickupLat,
  pickupLng: initialPickupLng,
  pickupName,
  dropLat,
  dropLng,
  dropName,
  initialCategory = 'all',
  onClose,
  compact = false,
  onOpenCarpool,
}) => {
  const [category, setCategory] = useState<'all' | 'cab' | 'auto' | 'bike' | 'carpool'>(initialCategory);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LiveCabComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPickupLat, setCurrentPickupLat] = useState<number>(initialPickupLat);
  const [currentPickupLng, setCurrentPickupLng] = useState<number>(initialPickupLng);
  const [gpsAcquired, setGpsAcquired] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  const [expandedTariffId, setExpandedTariffId] = useState<string | null>(null);

  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [launchNotice, setLaunchNotice] = useState<{ name: string; fallbackUrl: string; packageName?: string } | null>(null);

  // Sync category whenever initialCategory prop changes
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleAcquireGps = async () => {
    setGpsLoading(true);
    const loc = await requestAccurateUserLocation();
    setGpsLoading(false);
    if (loc) {
      setCurrentPickupLat(loc.lat);
      setCurrentPickupLng(loc.lng);
      setGpsAcquired(true);
    }
  };

  const fetchLivePrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiCategory = category === 'carpool' ? 'all' : category;
      const result = await faresApi.compareCabs({
        pickupLat: currentPickupLat,
        pickupLng: currentPickupLng,
        pickupName: gpsAcquired ? 'My Exact GPS Location' : pickupName,
        dropLat,
        dropLng,
        dropName,
        category: apiCategory,
      });
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Unable to check live fares right now');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePrices();
  }, [currentPickupLat, currentPickupLng, dropLat, dropLng, category]);

  const handleBookRedirect = (option: LiveCabOption) => {
    setLaunchingId(option.id);
    const fallback = sanitizeFallbackUrl(option.webFallbackLink || option.deepLink, option.androidPackage);

    launchMobileAppOrWeb(
      option.appScheme || option.deepLink,
      fallback,
      option.androidPackage
    );

    setLaunchNotice({
      name: option.displayName,
      fallbackUrl: fallback,
      packageName: option.androidPackage,
    });

    setTimeout(() => {
      setLaunchingId(null);
    }, 2000);
  };

  // Filter options by category
  const filteredOptions = (data?.options || []).filter((opt) => {
    if (category === 'all') return true;
    if (category === 'carpool') return false;
    return opt.category === category;
  });

  const availableOptions = filteredOptions
    .filter((opt) => opt.isAvailable !== false)
    .sort((a, b) => a.fare - b.fare);

  const unavailableOptions = filteredOptions.filter((opt) => opt.isAvailable === false);

  // Clean display name by stripping noisy technical suffixes
  const cleanDisplayName = (name: string) => {
    return name
      .replace(/\s*\((Verified|Digital Meter|Govt Meter)\)/gi, '')
      .trim();
  };

  return (
    <div className={`space-y-3 font-sans ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Route & Distance Summary */}
      <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs text-neutral-800 truncate font-bold flex items-center gap-1.5">
            <span className="truncate">{gpsAcquired ? '📍 Current GPS' : (pickupName || 'Pickup').split(',')[0]}</span>
            <span className="text-neutral-400">➔</span>
            <span className="truncate">{(dropName || 'Destination').split(',')[0]}</span>
          </div>
          {data && (
            <div className="text-[11px] text-neutral-500 flex items-center gap-2">
              <span>{data.distanceKm} km</span>
              <span>•</span>
              <span>~{data.durationMins} min drive</span>
              {data.availabilityReport?.cityName && (
                <>
                  <span>•</span>
                  <span className="text-neutral-600 font-medium">{data.availabilityReport.cityName}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAcquireGps}
            disabled={gpsLoading || gpsAcquired}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
              gpsAcquired
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-neutral-700 hover:text-black border-neutral-200'
            }`}
            title="Use exact GPS coordinates for ride pickup"
          >
            {gpsAcquired ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <MapPin className="w-3.5 h-3.5 text-amber-500" />}
            <span className="hidden sm:inline">{gpsAcquired ? 'GPS Set' : gpsLoading ? 'Locating...' : 'My GPS'}</span>
          </button>

          <button
            type="button"
            onClick={fetchLivePrices}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh prices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category Tabs: Clean Segmented Control with smooth scroll */}
      <div className="flex items-center overflow-x-auto no-scrollbar p-1 bg-neutral-100 rounded-xl gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'auto', label: '🛺 Auto' },
          { id: 'cab', label: '🚗 Cab' },
          { id: 'bike', label: '🛵 Bike' },
          { id: 'carpool', label: '🤝 Carpool' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id as any)}
            className={`flex-1 min-w-[64px] py-1.5 px-2.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              category === tab.id
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Carpool Quick Option (When Carpool Tab is selected) */}
      {category === 'carpool' && (
        <div className="p-3 rounded-2xl border border-purple-200 bg-purple-50 flex items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🤝</span>
            <div className="min-w-0">
              <div className="font-extrabold text-purple-950 text-xs truncate">
                Corridor Carpool Split
              </div>
              <div className="text-[11px] text-purple-700 font-medium truncate">
                Share ride with verified commuters
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-black text-xs sm:text-sm text-purple-950">~₹15-25</span>
            <button
              type="button"
              onClick={() => {
                if (onOpenCarpool) onOpenCarpool();
              }}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Match
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
          <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin mx-auto" />
          <div className="font-medium text-neutral-600">Comparing live fares...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
          <span className="truncate">{error}</span>
          <button type="button" onClick={fetchLivePrices} className="font-bold underline cursor-pointer shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Empty State when vehicle doesn't go */}
      {!loading && availableOptions.length === 0 && category !== 'carpool' && (
        <div className="py-6 px-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-center space-y-2">
          <div className="text-2xl">
            {category === 'auto' ? '🛺' : category === 'bike' ? '🛵' : '🚗'}
          </div>
          <div className="font-bold text-xs text-neutral-800">
            {category === 'auto'
              ? data && data.distanceKm > 25
                ? `Autos do not operate on ${data.distanceKm} km trips`
                : `No app-based autos operating in ${data?.availabilityReport?.cityName || 'this area'}`
              : category === 'bike'
                ? data && data.distanceKm > 18
                  ? `Bike taxis do not operate on ${data.distanceKm} km trips`
                  : `Bike taxis not available in ${data?.availabilityReport?.cityName || 'this area'}`
                : 'No cabs available for this route'}
          </div>
          <div className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
            {category === 'auto' && data && data.distanceKm > 25
              ? 'City autos cross municipal boundaries beyond 25 km. Please choose a Cab or Public Transit.'
              : category === 'bike' && data && data.distanceKm > 18
                ? 'Bike taxis are restricted to short intra-city trips under 18 km for passenger safety.'
                : data?.availabilityReport?.unsupportedVehicleReasons[`uber-${category}`] ||
                  `Vehicles of this type do not service this route on taxi apps.`}
          </div>
          {(category === 'auto' || category === 'bike') && (
            <button
              type="button"
              onClick={() => setCategory('cab')}
              className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <span>View Available Cabs</span>
            </button>
          )}
        </div>
      )}

      {/* Clean Minimalist Available Ride Options */}
      {availableOptions.length > 0 && (
        <div className="space-y-2">
          {availableOptions.map((option, idx) => {
            const isLowest = idx === 0 && availableOptions.length > 1;
            const isTariffExpanded = expandedTariffId === option.id;
            const displayName = cleanDisplayName(option.displayName);

            return (
              <div
                key={option.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isLowest
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* Main Row: Service Info & Fare + Book Button */}
                <div className="flex items-center justify-between gap-2.5">
                  {/* Service Identity */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-lg shrink-0">
                      {option.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-neutral-900 text-xs sm:text-sm truncate">
                          {displayName}
                        </span>
                        {isLowest && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                            Cheapest
                          </span>
                        )}
                        {option.isSurgeActive && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                            {option.surgeMultiplier}x
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5 font-medium">
                        <span>~{option.estimatedWaitMins}m away</span>
                        {option.savingsVsUber && option.savingsVsUber > 0 ? (
                          <span className="text-emerald-700 font-bold">• Save ₹{option.savingsVsUber}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Fare & Book Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-sm sm:text-base text-neutral-900 leading-tight">
                        ₹{option.fare}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookRedirect(option)}
                      disabled={launchingId === option.id}
                      className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs disabled:opacity-75"
                    >
                      <span>{launchingId === option.id ? '...' : 'Book'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-bar: Fare details toggle */}
                <div className="mt-1.5 pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="truncate">Includes base & taxes</span>
                  <button
                    type="button"
                    onClick={() => setExpandedTariffId(isTariffExpanded ? null : option.id)}
                    className="text-neutral-600 hover:text-black font-semibold underline cursor-pointer shrink-0 ml-2"
                  >
                    {isTariffExpanded ? 'Hide fare breakdown' : 'Fare breakdown'}
                  </button>
                </div>

                {/* Collapsible Fare Details */}
                {isTariffExpanded && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-600 space-y-1.5 bg-neutral-50/80 p-2.5 rounded-xl">
                    <div className="flex justify-between">
                      <span>Base Fare:</span>
                      <span className="font-semibold text-neutral-900">₹{option.baseFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate per km:</span>
                      <span className="font-semibold text-neutral-900">₹{option.perKmRate}/km</span>
                    </div>
                    {option.isSurgeActive && (
                      <div className="flex justify-between text-amber-700">
                        <span>Surge multiplier:</span>
                        <span className="font-semibold">{option.surgeMultiplier}x</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-neutral-200 pt-1 font-bold text-neutral-900">
                      <span>Estimated Fare:</span>
                      <span>₹{option.fare}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* App Launch Feedback */}
      {launchNotice && (
        <div className="p-3 bg-neutral-900 text-white rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="font-medium truncate">
            Opening {cleanDisplayName(launchNotice.name)}...
          </div>
          <a
            href={launchNotice.fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-white text-black hover:bg-neutral-200 rounded-lg text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
          >
            <span>Open in Browser</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
};

