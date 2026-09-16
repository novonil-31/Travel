import React, { useState, useEffect } from 'react';
import type { LiveCabComparisonResult, LiveCabOption } from '../api';
import { faresApi } from '../api';
import { ExternalLink, RefreshCw, Car } from 'lucide-react';

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
  pickupLat,
  pickupLng,
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

  // Sync category whenever initialCategory prop changes
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  const fetchLivePrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiCategory = category === 'carpool' ? 'all' : category;
      const result = await faresApi.compareCabs({
        pickupLat,
        pickupLng,
        pickupName,
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
  }, [pickupLat, pickupLng, dropLat, dropLng, category]);

  const handleBookRedirect = (option: LiveCabOption) => {
    window.open(option.deepLink, '_blank', 'noopener,noreferrer');
  };

  // Sort options: lowest price first, matching active category
  const filteredOptions = (data?.options || []).filter((opt) => {
    if (category === 'all') return true;
    if (category === 'carpool') return false;
    return opt.category === category;
  });
  const sortedOptions = [...filteredOptions].sort((a, b) => a.fare - b.fare);

  return (
    <div className={`space-y-3 font-sans ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Route & Distance Summary */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs text-neutral-800 truncate font-semibold">
            <span>{pickupName || 'Pickup'}</span>
            <span className="mx-1 text-neutral-400">➔</span>
            <span>{dropName || 'Destination'}</span>
          </div>
          {data && (
            <div className="text-[11px] text-neutral-500">
              {data.distanceKm} km • ~{data.durationMins} min drive
            </div>
          )}
        </div>

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
              ? 'Checking live prices across Rapido, Uber Moto, Ola Bike...'
              : category === 'auto'
                ? 'Checking live prices across Rapido Auto, Namma Yatri, Uber Auto...'
                : category === 'carpool'
                  ? 'Finding active corridor carpool matches...'
                  : 'Checking live prices across Uber, Ola, Rapido, Namma Yatri...'}
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

      {/* Simple, Clean List of Cab & Auto Options */}
      {!loading && sortedOptions.length === 0 && (
        <div className="py-6 text-center text-xs text-neutral-500">
          No {category !== 'all' ? (category === 'bike' ? 'bike taxi' : category === 'auto' ? 'auto rickshaw' : category === 'cab' ? 'private cab' : category) : 'ride'} options available right now.
        </div>
      )}

      {sortedOptions.length > 0 && (
        <div className="space-y-1.5">
          {sortedOptions.map((option, idx) => {
            const isLowest = idx === 0;

            return (
              <div
                key={option.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  isLowest
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
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
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      ~{option.estimatedWaitMins} min away
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
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Book</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clean, Simple Footnote */}
      <div className="text-[11px] text-neutral-400 text-center pt-1">
        Tapping Book opens the app with your pickup & drop already set.
      </div>
    </div>
  );
};
