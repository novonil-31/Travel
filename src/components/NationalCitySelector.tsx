import React, { useState } from 'react';
import {
  MapPin, Crosshair, ChevronDown, Check, Globe,
  Building2, Train, Sparkles, Navigation, X
} from 'lucide-react';
import { PRESET_REGIONS, setUserManualRegion, type IndianRegionKey } from '../utils/userLocationService';
import { useUserLocation } from '../hooks/useUserLocation';

interface NationalCitySelectorProps {
  onCityChanged?: () => void;
  className?: string;
  variant?: 'badge' | 'full' | 'compact';
}

export const NationalCitySelector: React.FC<NationalCitySelectorProps> = ({
  onCityChanged,
  className = '',
  variant = 'badge',
}) => {
  const { userLocation, isLocating, requestLocation } = useUserLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectRegion = (key: IndianRegionKey) => {
    setUserManualRegion(key);
    setIsOpen(false);
    if (onCityChanged) onCityChanged();
  };

  const handleUseGps = async () => {
    await requestLocation();
    setIsOpen(false);
    if (onCityChanged) onCityChanged();
  };

  const activeCityName = userLocation.cityName || userLocation.regionLabel || 'Pan-India';

  return (
    <>
      {/* Trigger Button */}
      {variant === 'badge' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-black text-xs font-bold transition-all shadow-xs border border-neutral-800 cursor-pointer ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeCityName}</span>
          <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0 ml-0.5" />
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 text-xs font-bold text-neutral-800 hover:text-black transition-colors ${className}`}
        >
          <MapPin className="w-3.5 h-3.5 text-neutral-800" />
          <span>{activeCityName}</span>
          <ChevronDown className="w-3 h-3 text-neutral-500" />
        </button>
      ) : (
        <div
          onClick={() => setIsOpen(true)}
          className={`p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-all ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-400">
                City / Region
              </div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>{activeCityName}</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  Active
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white text-black font-black text-xs hover:bg-neutral-200 transition-all"
          >
            Switch City
          </button>
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-white text-neutral-900 w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-neutral-900">
                    Select Your City / Transit Hub
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Pan-India Navigation & Mobility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GPS Instant Button */}
            <button
              type="button"
              onClick={handleUseGps}
              disabled={isLocating}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-between shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Crosshair className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block font-black text-white">Use My Current Location</span>
                  <span className="block text-[10px] text-neutral-400">
                    {isLocating ? 'Detecting GPS...' : 'High-Accuracy GPS'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-black">
                GPS
              </span>
            </button>

            {/* City Grid */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 px-1 pt-1">
                Major National Transit Hubs
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_REGIONS.map((region) => {
                  const isCurrent =
                    userLocation.cityName.toLowerCase().includes(region.cityName.toLowerCase()) ||
                    userLocation.regionKey === region.key;

                  return (
                    <button
                      key={region.key + region.cityName}
                      type="button"
                      onClick={() => handleSelectRegion(region.key)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 select-none cursor-pointer ${
                        isCurrent
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-400' : 'text-neutral-500'}`} />
                          <span className="font-extrabold text-xs">{region.cityName}</span>
                        </div>
                        {isCurrent && (
                          <span className="w-4 h-4 rounded-full bg-emerald-400 text-black flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium truncate w-full ${isCurrent ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {region.fameTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
