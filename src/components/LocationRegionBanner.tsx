import React, { useState, useRef, useEffect } from 'react';
import { Crosshair, MapPin, ChevronDown, Check, Loader2, Compass } from 'lucide-react';
import { useUserLocation } from '../hooks/useUserLocation';
import type { IndianRegionKey } from '../utils/userLocationService';

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
  const { userLocation, isLocating, error, requestLocation, setManualCity, presetRegions } = useUserLocation();
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDetectGPS = async () => {
    const loc = await requestLocation();
    if (loc) {
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 3000);
      if (onLocationChanged) onLocationChanged();
    }
  };

  const handleSelectCity = (key: IndianRegionKey) => {
    setManualCity(key);
    setIsOpenMenu(false);
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 3000);
    if (onLocationChanged) onLocationChanged();
  };

  if (compact) {
    return (
      <div className={`relative inline-block ${className}`} ref={menuRef}>
        <div className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-800 transition-colors">
          <MapPin className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
          <button
            type="button"
            onClick={() => setIsOpenMenu(!isOpenMenu)}
            className="flex items-center gap-1 hover:text-black focus:outline-none"
          >
            <span className="truncate max-w-[160px] sm:max-w-[220px]">{userLocation.placeName || userLocation.cityName}</span>
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </button>

          <div className="h-3 w-px bg-neutral-300 mx-0.5" />

          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            title="Detect GPS Location"
            className="p-0.5 text-neutral-600 hover:text-black transition-colors focus:outline-none"
          >
            {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isOpenMenu && (
          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-neutral-300 rounded-2xl shadow-xl z-50 overflow-hidden py-1 text-xs">
            <div className="px-3 py-2 border-b border-neutral-100 font-black text-neutral-500 uppercase tracking-wider text-[10px] flex items-center justify-between">
              <span>Select Your Region</span>
              <button
                type="button"
                onClick={handleDetectGPS}
                className="text-black font-bold hover:underline flex items-center gap-1"
              >
                <Crosshair className="w-3 h-3" />
                <span>Use GPS</span>
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {presetRegions.map((region) => {
                const isSelected = userLocation.regionKey === region.key;
                return (
                  <button
                    key={region.key}
                    type="button"
                    onClick={() => handleSelectCity(region.key)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-neutral-50 transition-colors ${
                      isSelected ? 'bg-neutral-100 font-bold text-black' : 'text-neutral-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? <Check className="w-3.5 h-3.5 text-black" /> : <MapPin className="w-3.5 h-3.5 text-neutral-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{region.label}</div>
                      <div className="text-[10px] text-neutral-500 line-clamp-1">{region.fameTag}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-neutral-900 text-white rounded-2xl p-3 sm:p-4 border border-neutral-800 shadow-md ${className}`} ref={menuRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-neutral-400 flex items-center gap-1.5">
              <span>Active Search Region & Priorities</span>
              {successFlash && (
                <span className="bg-white text-black px-1.5 py-0.2 rounded text-[9px] font-black animate-pulse">
                  Location Updated
                </span>
              )}
            </div>
            <div className="text-sm font-black text-white flex items-center gap-1.5 truncate">
              <span>{userLocation.placeName || userLocation.regionLabel}</span>
              {userLocation.permissionGranted && (
                <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  GPS Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Detect GPS Button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                <span>{userLocation.permissionGranted ? 'Re-detect Location' : 'Allow Location Access'}</span>
              </>
            )}
          </button>

          {/* Switch City Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpenMenu(!isOpenMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-bold text-xs hover:bg-neutral-700 transition-colors"
            >
              <span>Change Region</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {isOpenMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-neutral-900 border border-neutral-300 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="px-3 py-2 border-b border-neutral-100 font-black text-neutral-500 uppercase tracking-wider text-[10px]">
                  Choose Location & Search Priority
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-neutral-50">
                  {presetRegions.map((region) => {
                    const isSelected = userLocation.regionKey === region.key;
                    return (
                      <button
                        key={region.key}
                        type="button"
                        onClick={() => handleSelectCity(region.key)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-neutral-50 transition-colors ${
                          isSelected ? 'bg-neutral-100 font-bold text-black' : 'text-neutral-800'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? <Check className="w-4 h-4 text-black" /> : <MapPin className="w-4 h-4 text-neutral-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs truncate">{region.label}</div>
                          <div className="text-[10px] text-neutral-500 line-clamp-1">{region.fameTag}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
          <span>⚠️ {error}. You can select your region from the dropdown above.</span>
        </div>
      )}
    </div>
  );
};
