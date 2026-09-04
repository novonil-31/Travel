import React, { useState } from 'react';
import { Crosshair, MapPin, Loader2, Compass, Radio } from 'lucide-react';
import { useUserLocation } from '../hooks/useUserLocation';

interface LocationRegionBannerProps {
  compact?: boolean;
  className?: string;
  onLocationChanged?: () => void;
}

export const LocationRegionBanner: React.FC<LocationRegionBannerProps> = ({
  compact = false,
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

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 bg-neutral-100 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-xs text-neutral-800 ${className}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            {userLocation.permissionGranted ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400"></span>
            )}
          </span>
          <MapPin className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-[240px] font-semibold text-neutral-900">
            {userLocation.placeName || userLocation.cityName || userLocation.regionLabel}
          </span>
        </div>

        <div className="h-3 w-px bg-neutral-300 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isLocating}
          title="Refresh GPS Location"
          className="p-1 rounded-md text-neutral-600 hover:text-black hover:bg-neutral-200 transition-colors focus:outline-none shrink-0"
        >
          {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-900" /> : <Crosshair className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-900 text-white rounded-2xl p-3 sm:p-4 border border-neutral-800 shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0">
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-400 flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live GPS Location (Auto-Detected)
              </span>
              {successFlash && (
                <span className="bg-white text-black px-1.5 py-0.2 rounded text-[9px] font-black animate-pulse">
                  Location Refreshed
                </span>
              )}
            </div>
            <div className="text-sm font-black text-white flex items-center gap-2 truncate mt-0.5">
              <span className="truncate">{userLocation.placeName || userLocation.regionLabel}</span>
              {userLocation.permissionGranted ? (
                <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                  <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                  Background Tracking Active
                </span>
              ) : (
                <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0">
                  Detecting in background...
                </span>
              )}
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
