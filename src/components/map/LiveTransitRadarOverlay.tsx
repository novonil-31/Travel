import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import type { AuthenticVehicleRecord } from '../../utils/liveTransitRadar';

/**
 * Minimalist, clean vehicle pin (Apple Maps / Citymapper style)
 * NO glowing neon halos, NO artificial animations
 */
export function createMinimalistRadarPin(vehicle: AuthenticVehicleRecord) {
  const isTrain = vehicle.routeShortName?.includes('RAIL') || vehicle.label.toLowerCase().includes('train');
  const bgColor = isTrain ? '#1d4ed8' : '#0f172a';
  const iconEmoji = isTrain ? '🚆' : '🚌';

  return L.divIcon({
    className: 'authentic-radar-vehicle-pin',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <!-- Clean Label Pill -->
        <div style="
          background: #ffffff;
          color: #0f172a;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 9999px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
          margin-bottom: 2px;
        ">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #10b981;"></span>
          <span>${vehicle.routeShortName || vehicle.label.split(' ')[0]}</span>
        </div>

        <!-- Minimalist Circular Vehicle Capsule -->
        <div style="
          width: 28px;
          height: 28px;
          background: ${bgColor};
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          font-size: 12px;
        ">
          ${iconEmoji}
        </div>
      </div>
    `,
    iconSize: [50, 48],
    iconAnchor: [25, 40],
  });
}

interface LiveTransitRadarOverlayProps {
  vehicles: AuthenticVehicleRecord[];
  onSelectVehicle?: (vehicle: AuthenticVehicleRecord) => void;
}

export function LiveTransitRadarOverlay({
  vehicles,
  onSelectVehicle,
}: LiveTransitRadarOverlayProps) {
  // ZERO FABRICATION: If no authentic telemetry exists, render absolutely nothing on map
  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  return (
    <>
      {vehicles.map((veh) => {
        const pinIcon = createMinimalistRadarPin(veh);

        return (
          <Marker
            key={veh.vehicleId}
            position={[veh.latitude, veh.longitude]}
            icon={pinIcon}
            eventHandlers={{
              click: () => {
                if (onSelectVehicle) onSelectVehicle(veh);
              },
            }}
          >
            <Popup>
              <div className="text-xs space-y-1.5 p-1 min-w-[210px] text-neutral-900 font-sans">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                  <span className="font-black text-neutral-900 text-xs truncate">
                    {veh.label}
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                    Live
                  </span>
                </div>

                {/* Route context */}
                {veh.routeLongName && (
                  <div className="text-[11px] text-neutral-600 font-medium leading-tight">
                    {veh.routeLongName}
                  </div>
                )}

                {/* Real-time Occupancy & Speed */}
                <div className="bg-neutral-50 rounded-lg p-1.5 space-y-1 text-[11px] border border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Occupancy:</span>
                    <span className="font-bold text-neutral-800">
                      {veh.occupancyStatus === 'MANY_SEATS_AVAILABLE'
                        ? 'Seats Available'
                        : veh.occupancyStatus === 'STANDING_ROOM_ONLY'
                        ? 'Standing Room'
                        : veh.occupancyStatus === 'FULL'
                        ? 'Full'
                        : 'Low Crowding'}
                    </span>
                  </div>

                  {veh.speedKmh !== null && veh.speedKmh !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Speed:</span>
                      <span className="font-mono font-bold text-neutral-800">{veh.speedKmh} km/h</span>
                    </div>
                  )}
                </div>

                {/* Accessibility */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{veh.hasRamp ? 'Wheelchair Ramp Verified' : 'Standard Boarding'}</span>
                </div>

                {/* Provenance */}
                <div className="text-[9px] text-neutral-400 pt-0.5 border-t border-neutral-100 flex items-center justify-between">
                  <span>Source: {veh.source}</span>
                  <span>{veh.freshness?.label || 'Observed'}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
