import React, { useState } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  Bus,
  Train,
  Clock,
  Users,
  CheckCircle2,
  Volume2,
  Sparkles,
  Crosshair,
  Wifi,
  ShieldCheck,
  Thermometer,
  RotateCw
} from 'lucide-react';
import type { LiveRadarVehicle } from '../../utils/liveTransitRadar';
import { speakTransitAnnouncement } from '../../utils/liveTransitRadar';

/**
 * Creates custom radar vehicle pin with directional arrow and live speed badge
 */
export function createRadarVehicleIcon(vehicle: LiveRadarVehicle, isSelected: boolean = false) {
  const isTrain = vehicle.vehicleType === 'train';
  const isShuttle = vehicle.vehicleType === 'shuttle';
  const bgColor = isTrain ? '#1d4ed8' : isShuttle ? '#0d9488' : '#059669';
  const iconEmoji = isTrain ? '🚆' : isShuttle ? '⚡' : '🚌';

  return L.divIcon({
    className: 'live-radar-vehicle-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <!-- Pulsing Radar Halo -->
        <div style="
          position: absolute;
          top: 5px;
          width: 44px;
          height: 44px;
          background: ${bgColor};
          opacity: 0.25;
          border-radius: 50%;
          animation: radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        <!-- Fleet Tag Pill -->
        <div style="
          background: #0f172a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 9999px;
          border: 1.5px solid #334155;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;
          z-index: 10;
        ">
          <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite;"></span>
          <span>${vehicle.fleetNumber.split('-').slice(-2).join('-')}</span>
          <span style="color: #94a3b8; font-size: 9px;">• ${vehicle.speedKmh} km/h</span>
        </div>

        <!-- Central Vehicle Capsule with Directional Indicator -->
        <div style="
          width: 36px;
          height: 36px;
          background: ${bgColor};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          font-size: 16px;
          position: relative;
        ">
          <span>${iconEmoji}</span>

          <!-- Heading Needle / Directional Arrow -->
          <div style="
            position: absolute;
            top: -6px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 8px solid #ffffff;
            transform: rotate(${vehicle.bearing}deg);
            transform-origin: 5px 24px;
          "></div>
        </div>

        ${vehicle.wheelchairBayVacant ? `
          <div style="
            position: absolute;
            bottom: -3px;
            right: 2px;
            background: #2563eb;
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 1.5px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">♿</div>
        ` : ''}
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 32],
  });
}

interface LiveTransitRadarOverlayProps {
  vehicles: LiveRadarVehicle[];
  activeRouteName: string;
  onSelectVehicle?: (vehicle: LiveRadarVehicle) => void;
}

export function LiveTransitRadarOverlay({
  vehicles,
  activeRouteName,
  onSelectVehicle,
}: LiveTransitRadarOverlayProps) {
  const map = useMap();
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

  const handleFocusVehicle = (veh: LiveRadarVehicle) => {
    setActiveVehicleId(veh.id);
    map.flyTo([veh.lat, veh.lng], Math.max(map.getZoom(), 15), {
      duration: 0.8,
    });
    if (onSelectVehicle) {
      onSelectVehicle(veh);
    }
  };

  const handleSpeakAnnouncement = (veh: LiveRadarVehicle) => {
    const text = `${veh.routeName} fleet ${veh.fleetNumber} is currently traveling at ${veh.speedKmh} kilometers per hour. Next stop is ${veh.nextStopName} in approximately ${Math.round(veh.etaSecondsToBoarding / 60)} minutes. Certified step-free wheelchair ramp is functional and ready.`;
    speakTransitAnnouncement(text);
  };

  return (
    <>
      {vehicles.map((veh) => {
        const isFocused = activeVehicleId === veh.id;
        const icon = createRadarVehicleIcon(veh, isFocused);

        return (
          <Marker
            key={veh.id}
            position={[veh.lat, veh.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                setActiveVehicleId(veh.id);
                if (onSelectVehicle) onSelectVehicle(veh);
              },
            }}
          >
            <Popup>
              <div className="text-xs space-y-2 p-1 min-w-[240px] text-neutral-900 font-sans">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                  <div className="flex items-center gap-1.5 font-black text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>LIVE VEHICLE TELEMETRY</span>
                  </div>
                  <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-bold">
                    {veh.fleetNumber}
                  </span>
                </div>

                {/* Route Name & Live Speedometer */}
                <div>
                  <div className="font-extrabold text-sm text-neutral-950 leading-tight">
                    {veh.routeName}
                  </div>
                  <div className="flex items-center gap-3 text-neutral-500 text-[11px] mt-1 font-medium">
                    <span className="flex items-center gap-1 font-bold text-neutral-800">
                      <Navigation className="w-3 h-3 text-emerald-600" style={{ transform: `rotate(${veh.bearing}deg)` }} />
                      {veh.speedKmh} km/h
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-600" />
                      AC {veh.interiorTempC}°C
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">
                      {veh.delayMinutes === 0 ? 'On Time' : `+${veh.delayMinutes}m delay`}
                    </span>
                  </div>
                </div>

                {/* Next Stop & ETA Banner */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 font-medium">Approaching Stop:</span>
                    <span className="font-black text-neutral-900">{veh.nextStopName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 font-medium">Estimated Arrival:</span>
                    <span className="font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      ~{Math.max(1, Math.round(veh.etaSecondsToBoarding / 60))} min ({veh.distanceToNextStopM}m away)
                    </span>
                  </div>
                </div>

                {/* Seats & Wheelchair Bay Status */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-neutral-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Occupancy:
                    </span>
                    <span className={veh.occupancyPercent > 75 ? 'text-amber-700' : 'text-emerald-700'}>
                      {veh.seatsAvailable} of {veh.totalSeats} seats available ({veh.occupancyPercent}%)
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        veh.occupancyPercent > 80 ? 'bg-red-500' : veh.occupancyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${veh.occupancyPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Accessibility Verification */}
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ramp Functional & Ready</span>
                  </span>
                  <span className="bg-emerald-200/60 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                    {veh.wheelchairBayVacant ? '♿ Bay Vacant' : '♿ Bay In Use'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFocusVehicle(veh)}
                    className="flex-1 bg-neutral-900 text-white font-bold py-1.5 px-2 rounded-lg text-[11px] hover:bg-neutral-800 flex items-center justify-center gap-1 transition-all"
                  >
                    <Crosshair className="w-3 h-3" />
                    Center Map
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpeakAnnouncement(veh)}
                    className="bg-emerald-600 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] hover:bg-emerald-700 flex items-center justify-center gap-1 transition-all"
                    title="Audio Stop Announcement"
                  >
                    <Volume2 className="w-3 h-3" />
                    Announce
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
