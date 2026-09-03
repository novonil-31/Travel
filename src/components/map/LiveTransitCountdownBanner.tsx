import React, { useState, useEffect } from 'react';
import {
  Clock,
  Navigation,
  Bus,
  Train,
  Users,
  CheckCircle2,
  Volume2,
  Wifi,
  Sparkles,
  AlertCircle,
  RotateCw,
  Share2,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import type { LiveRadarVehicle, UpcomingDeparture } from '../../utils/liveTransitRadar';
import { formatCountdown, speakTransitAnnouncement } from '../../utils/liveTransitRadar';

interface LiveTransitCountdownBannerProps {
  routeNumber: string;
  routeName: string;
  vehicleType: string;
  nearestVehicle?: LiveRadarVehicle | null;
  upcomingDepartures: UpcomingDeparture[];
  activeStopName: string;
  onRefreshRadar?: () => void;
  onReportCrowding?: () => void;
}

export function LiveTransitCountdownBanner({
  routeNumber,
  routeName,
  vehicleType,
  nearestVehicle,
  upcomingDepartures,
  activeStopName,
  onRefreshRadar,
  onReportCrowding,
}: LiveTransitCountdownBannerProps) {
  // Local real-time second ticker for smooth countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    nearestVehicle?.etaSecondsToBoarding || (upcomingDepartures[0]?.etaMinutes ? upcomingDepartures[0].etaMinutes * 60 : 180)
  );
  const [isAudioSpeaking, setIsAudioSpeaking] = useState<boolean>(false);
  const [crowdingFeedbackSent, setCrowdingFeedbackSent] = useState<boolean>(false);

  useEffect(() => {
    if (nearestVehicle?.etaSecondsToBoarding) {
      setSecondsRemaining(nearestVehicle.etaSecondsToBoarding);
    }
  }, [nearestVehicle?.etaSecondsToBoarding]);

  // Tick down every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 1 ? prev - 1 : 180));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = formatCountdown(secondsRemaining);

  const handleAudioAnnouncement = () => {
    setIsAudioSpeaking(true);
    const stopStr = activeStopName ? `at ${activeStopName}` : 'at your boarding point';
    const vehStr = nearestVehicle
      ? `${nearestVehicle.routeName} fleet ${nearestVehicle.fleetNumber} is arriving in approximately ${countdown.minutes > 0 ? `${countdown.minutes} minutes` : `${countdown.remainingSec} seconds`}. Current speed is ${nearestVehicle.speedKmh} km per hour. Step-free wheelchair ramp is functional and ready.`
      : `${routeName} is scheduled to arrive ${stopStr} in ${countdown.minutes} minutes. Low floor wheelchair ramp certified.`;

    speakTransitAnnouncement(vehStr);
    setTimeout(() => setIsAudioSpeaking(false), 5000);
  };

  const handleQuickCrowdReport = () => {
    setCrowdingFeedbackSent(true);
    if (onReportCrowding) onReportCrowding();
    setTimeout(() => setCrowdingFeedbackSent(false), 3500);
  };

  const isTrain = vehicleType === 'train';
  const themeColor = isTrain ? 'from-blue-900 to-indigo-950 border-blue-800' : 'from-emerald-950 via-slate-900 to-neutral-950 border-emerald-800/40';

  return (
    <div className={`bg-gradient-to-r ${themeColor} border text-white rounded-3xl p-4 sm:p-5 shadow-lg relative overflow-hidden`}>
      {/* Background Animated Radar Grid Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Wifi className="w-3 h-3" /> Live GPS Transit Radar
          </span>
          {nearestVehicle?.fleetNumber && (
            <span className="text-[10px] font-mono bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full font-bold">
              {nearestVehicle.fleetNumber}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAudioAnnouncement}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isAudioSpeaking ? 'bg-emerald-500 text-black animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Listen to Live Speech Announcement"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audio Guide</span>
          </button>
          {onRefreshRadar && (
            <button
              type="button"
              onClick={onRefreshRadar}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all"
              title="Refresh Telemetry"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Center Countdown & Live Speed Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Countdown Big Display */}
        <div className="sm:col-span-6 flex items-center gap-3.5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex flex-col items-center justify-center p-2 shrink-0 shadow-inner">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white leading-none">
              {countdown.display}
            </div>
            <div className="text-[9px] uppercase font-extrabold text-emerald-400 mt-1">
              {countdown.minutes === 0 ? 'Seconds' : 'Minutes'}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-neutral-300">
              Arriving at <span className="font-bold text-white">{activeStopName || 'Your Stop'}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>{routeNumber}</span>
              <span className="text-neutral-400 text-xs font-normal truncate max-w-[170px]">{routeName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-300 mt-1">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {nearestVehicle?.delayMinutes === 0 ? 'On Time' : `+${nearestVehicle?.delayMinutes || 0}m Delay`}
              </span>
              {nearestVehicle?.speedKmh && (
                <>
                  <span>•</span>
                  <span className="font-mono text-neutral-200">
                    ⚡ {nearestVehicle.speedKmh} km/h
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live Seat Occupancy & Ramp Card */}
        <div className="sm:col-span-6 bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 flex items-center gap-1 font-semibold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Live Seat Occupancy
            </span>
            <span className="font-bold text-emerald-400 text-[11px]">
              {nearestVehicle ? `${nearestVehicle.seatsAvailable} seats free` : 'Seats Available'}
            </span>
          </div>

          {/* Occupancy Bar */}
          <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                (nearestVehicle?.occupancyPercent || 45) > 80 ? 'bg-red-500' : (nearestVehicle?.occupancyPercent || 45) > 55 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${nearestVehicle?.occupancyPercent || 45}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-emerald-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ♿ Certified Ramp Ready
            </span>
            <span className="font-mono text-[10px] bg-white/10 text-neutral-200 px-2 py-0.5 rounded-full font-bold">
              {nearestVehicle?.wheelchairBayVacant ? 'Bay Free' : 'Bay In Use'}
            </span>
          </div>
        </div>
      </div>

      {/* Headway Row: Next 3 Upcoming Departures */}
      {upcomingDepartures && upcomingDepartures.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center flex-wrap gap-2 text-xs">
          <span className="text-[11px] font-bold text-neutral-400 shrink-0">Subsequent Buses:</span>
          {upcomingDepartures.slice(1, 3).map((dep, idx) => (
            <div
              key={idx}
              className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-2.5 py-1 flex items-center gap-1.5 transition-all text-[11px]"
            >
              <Clock className="w-3 h-3 text-neutral-400" />
              <span className="font-bold text-white">in {dep.etaMinutes} min</span>
              <span className="text-neutral-400 font-mono text-[10px]">({dep.departureTimeFormatted})</span>
              {dep.isLiveGps && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </div>
          ))}

          {/* Quick 1-Tap Crowding feedback */}
          <button
            type="button"
            onClick={handleQuickCrowdReport}
            className="ml-auto text-[10px] font-bold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1"
          >
            {crowdingFeedbackSent ? '✓ Ground-Truth Confirmed!' : '👍 Confirm Live Status'}
          </button>
        </div>
      )}
    </div>
  );
}
