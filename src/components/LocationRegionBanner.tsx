import React, { useState } from 'react';
import { Crosshair, MapPin, Loader2, Compass, Radio } from 'lucide-react';
import { useUserLocation } from '../hooks/useUserLocation';

interface LocationRegionBannerProps {
  compact?: boolean;
  dark?: boolean;
  className?: string;
  onLocationChanged?: () => void;
}

export const LocationRegionBanner: React.FC<LocationRegionBannerProps> = ({
  compact = false,
  dark = false,
  className = '',
  onLocationChanged,
}) => {
  const { userLocation, isLocating, error, requestLocation } = useUserLocation();
  const [successFlash, setSuccessFlash] = useState(false);

  const handleDetectGPS = async () => {
    const loc = await requestLocation();
    if (loc) {
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 3000);
      if (onLocationChanged) onLocationChanged();
    }
  };

  const isRealGps = userLocation.hasGpsPriority === true || userLocation.permissionGranted;
  const fullLabel = userLocation.placeName || userLocation.cityName || userLocation.regionLabel || 'Locating...';
  const shortCityLabel = userLocation.cityName || userLocation.placeName?.split(',')[0]?.trim() || 'My Location';

  if (compact) {
    return (
      <div
        onClick={handleDetectGPS}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDetectGPS(); }}
        title={isRealGps ? `Live GPS Active: ${fullLabel} (Click to refresh)` : `Location: ${fullLabel} (Click to detect GPS)`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-all border cursor-pointer select-none shrink-0 ${
          dark
            ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 active:scale-95'
            : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800 active:scale-95'
        } ${className}`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            {isRealGps ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" title="Approximate location"></span>
            )}
          </span>
          <MapPin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`} />
          {/* Responsive label: on mobile screen show short city name without overflow */}
          <span className={`truncate text-[11px] sm:text-xs font-semibold max-w-[70px] sm:max-w-[170px] ${dark ? 'text-white' : 'text-neutral-900'}`}>
            <span className="sm:hidden">{shortCityLabel}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
          </span>
        </div>

        {isLocating ? (
          <Loader2 className="w-3 h-3 animate-spin text-emerald-400 shrink-0 ml-0.5" />
        ) : (
          <Crosshair className={`w-3 h-3 shrink-0 hidden sm:block ${dark ? 'text-neutral-400' : 'text-neutral-500'}`} />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-neutral-900 text-white rounded-2xl p-3 sm:p-4 border border-neutral-800 shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0">
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-400 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live GPS Location
              </span>
              {successFlash && (
                <span className="bg-white text-black px-1.5 py-0.2 rounded text-[9px] font-black animate-pulse">
                  Refreshed
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2 flex-wrap sm:flex-nowrap mt-0.5 min-w-0">
              <span className="truncate min-w-0">{userLocation.placeName || userLocation.regionLabel}</span>
              {userLocation.permissionGranted ? (
                <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                  GPS Active
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                <span>Refresh GPS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
          <span>⚠️ {error}. Trying to obtain background coordinates automatically.</span>
        </div>
      )}
    </div>
  );
};
