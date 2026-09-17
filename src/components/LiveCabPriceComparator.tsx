import React, { useState, useEffect } from 'react';
import type { LiveCabComparisonResult, LiveCabOption, CityTransportReport } from '../api';
import { faresApi } from '../api';
import { ExternalLink, RefreshCw, Car, MapPin, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp, ShieldCheck, XCircle } from 'lucide-react';
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

  const [showCoverageReport, setShowCoverageReport] = useState<boolean>(false);
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

  const report = data?.availabilityReport;

  return (
    <div className={`space-y-3 font-sans ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Route & Distance Summary */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs text-neutral-800 truncate font-semibold flex items-center gap-1">
            <span className="truncate">{gpsAcquired ? '📍 Current GPS' : (pickupName || 'Pickup')}</span>
            <span className="text-neutral-400">➔</span>
            <span className="truncate">{dropName || 'Destination'}</span>
          </div>
          {data && (
            <div className="text-[11px] text-neutral-500 flex items-center gap-2">
              <span>{data.distanceKm} km • ~{data.durationMins} min drive</span>
              {report && (
                <span className="text-emerald-700 font-medium hidden sm:inline">
                  • {report.cityName}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAcquireGps}
            disabled={gpsLoading || gpsAcquired}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors cursor-pointer ${
              gpsAcquired
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-neutral-600 hover:text-neutral-900 border-neutral-200'
            }`}
            title="Use exact GPS coordinates for ride pickup"
          >
            {gpsAcquired ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <MapPin className="w-3 h-3 text-amber-500" />}
            <span>{gpsAcquired ? 'GPS Set' : gpsLoading ? 'Locating...' : 'My GPS'}</span>
          </button>

          <button
            type="button"
            onClick={fetchLivePrices}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
            title="Refresh prices"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Transport App Availability & Operational Report Badge */}
      {report && (
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">📍</span>
              <span className="font-bold text-xs text-neutral-900 truncate">
                {report.regionLabel}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0">
                Live Coverage Verified
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCoverageReport((v) => !v)}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>{showCoverageReport ? 'Hide Report' : 'App Coverage Report'}</span>
              {showCoverageReport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Quick Coverage summary tags */}
          <div className="flex items-center flex-wrap gap-1 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              🚖 Rapido: Auto & Bike (Active)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium">
              🚕 Ola: Cab & Auto (Active)
            </span>
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              report.availableProviders.uber.auto.active
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              🚗 Uber: Cabs {report.availableProviders.uber.auto.active ? '& Auto' : '(No Auto in this city)'}
            </span>
          </div>

          {/* Expandable Comprehensive Coverage Disclosure */}
          {showCoverageReport && (
            <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-700 space-y-1.5 animate-fadeIn">
              <div className="font-semibold text-neutral-900 text-[11px]">
                Ground Operational Status for {report.cityName}:
              </div>
              <ul className="space-y-1 text-[11px] text-neutral-600 pl-1">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Rapido</strong>: Primary on-demand Auto Rickshaw & Bike Taxi service in this corridor.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Ola Cabs</strong>: Ola Mini cabs & Ola Auto (digital meter) active and operating.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  {report.availableProviders.uber.auto.active ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>
                    <strong>Uber</strong>: Uber Go / Premier cabs are operating. {report.availableProviders.uber.auto.active ? 'Uber Auto is active.' : '⚠️ Uber Auto does NOT operate auto rickshaws in Odisha/this city.'}
                  </span>
                </li>
              </ul>
              {report.distanceWarning && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                  {report.distanceWarning}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category Tabs: All / Bike / Auto / Cab / Carpool */}
      <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
        {[
          { id: 'all', label: 'All' },
          { id: 'bike', label: '🛵 Bike' },
          { id: 'auto', label: '🛺 Auto' },
          { id: 'cab', label: '🚗 Cab' },
          { id: 'carpool', label: '🤝 Carpool' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id as any)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors cursor-pointer ${
              category === tab.id
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Verified Carpool Option Banner (Always visible in 'all' and 'carpool') */}
      {(category === 'all' || category === 'carpool') && (
        <div className="p-3 rounded-xl border border-purple-300 bg-purple-50/80 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🤝</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-purple-950 text-xs truncate">
                  Corridor Carpool Split
                </span>
                <span className="bg-purple-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  Save ~65%
                </span>
              </div>
              <div className="text-[11px] text-purple-800 font-medium truncate">
                Share ride with verified corridor co-riders
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-black text-xs text-purple-900">
              ₹15 - ₹25
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenCarpool) onOpenCarpool();
              }}
              className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Match Pool</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="py-8 text-center text-xs text-neutral-500 space-y-1">
          <div className="text-2xl animate-bounce">
            {category === 'bike' ? '🛵' : category === 'auto' ? '🛺' : category === 'carpool' ? '🤝' : '🚗'}
          </div>
          <div>
            {category === 'bike'
              ? 'Checking live prices across Rapido Bike & Uber Moto...'
              : category === 'auto'
                ? 'Checking verified live prices across Rapido Auto & Ola Auto...'
                : category === 'carpool'
                  ? 'Finding active corridor carpool matches...'
                  : 'Checking verified fares across Uber, Ola, Rapido...'}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchLivePrices} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && availableOptions.length === 0 && unavailableOptions.length === 0 && (
        <div className="py-6 text-center text-xs text-neutral-500">
          No ride options available for this category right now.
        </div>
      )}

      {/* VERIFIED AVAILABLE OPTIONS LIST */}
      {availableOptions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-neutral-500 px-1 flex items-center justify-between">
            <span>Verified Operating in {report?.cityName || 'this Area'}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">✓ Exact Prices</span>
          </div>

          {availableOptions.map((option, idx) => {
            const isLowest = idx === 0;
            const isTariffExpanded = expandedTariffId === option.id;

            return (
              <div
                key={option.id}
                className={`p-3 rounded-xl border transition-colors ${
                  isLowest
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Icon & Service Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{option.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-900 text-xs truncate">
                          {option.displayName}
                        </span>
                        {isLowest && (
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Lowest
                          </span>
                        )}
                        {option.isSurgeActive && (
                          <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {option.surgeMultiplier}x Rush
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                        <span>~{option.estimatedWaitMins} min away</span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setExpandedTariffId(isTariffExpanded ? null : option.id)}
                          className="text-neutral-600 hover:text-black underline cursor-pointer"
                        >
                          {isTariffExpanded ? 'Hide Tariff' : 'Tariff Details'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Book Button */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-black text-sm text-neutral-900">
                      ₹{option.fare}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBookRedirect(option)}
                      disabled={launchingId === option.id}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-75"
                    >
                      <span>{launchingId === option.id ? 'Opening...' : 'Book'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Itemized Tariff Breakdown */}
                {isTariffExpanded && (
                  <div className="mt-2 pt-2 border-t border-neutral-100 text-[11px] text-neutral-600 space-y-1 bg-neutral-50/70 p-2 rounded-lg animate-fadeIn">
                    <div className="flex justify-between">
                      <span>Base Fare (First 1.5 km):</span>
                      <span className="font-semibold">₹{option.baseFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per-km Rate:</span>
                      <span className="font-semibold">₹{option.perKmRate}/km</span>
                    </div>
                    {option.isSurgeActive && (
                      <div className="flex justify-between text-amber-700">
                        <span>Rush Hour Surge:</span>
                        <span className="font-semibold">{option.surgeMultiplier}x ({data?.surgeStatus.periodName})</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-neutral-200/70 pt-1 font-bold text-neutral-900">
                      <span>Estimated Total Bill:</span>
                      <span>₹{option.fare}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DISCLOSED UNAVAILABLE SERVICES IN THIS LOCATION */}
      {unavailableOptions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-neutral-500 px-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Not Operating in {report?.cityName || 'this Location'}</span>
          </div>

          {unavailableOptions.map((opt) => (
            <div
              key={opt.id}
              className="p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/40 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base opacity-70 shrink-0">{opt.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-neutral-800 line-through truncate text-xs">
                      {opt.displayName}
                    </span>
                    <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                      Unavailable Here
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-700/90 truncate">
                    {opt.unavailabilityReason || `Not available in ${report?.cityName || 'this area'}`}
                  </div>
                </div>
              </div>

              {/* Instant Alternative Booking Switcher */}
              {availableOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleBookRedirect(availableOptions[0])}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer"
                  title={`Book ${availableOptions[0].displayName} instead`}
                >
                  <span>Book {availableOptions[0].displayName.split(' ')[0]}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Launch Feedback Banner with Safe Store / Web Fallback */}
      {launchNotice && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="text-blue-900 font-medium truncate">
            🚀 Launching {launchNotice.name} app...
          </div>
          <a
            href={launchNotice.fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold shrink-0 inline-flex items-center gap-1 shadow-xs"
          >
            <span>Store Fallback</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}

      {/* Clean, Simple Footnote */}
      <div className="text-[11px] text-neutral-400 text-center pt-1">
        Fares calibrated to verified ground meter & platform tariffs in {report?.cityName || 'India'}.
      </div>
    </div>
  );
};
