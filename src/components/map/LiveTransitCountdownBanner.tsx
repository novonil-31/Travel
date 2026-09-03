import React, { useState } from 'react';
import {
  Clock,
  Radio,
  CheckCircle2,
  Volume2,
  Users,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  X,
  Sparkles
} from 'lucide-react';
import type { AuthenticRadarStatus } from '../../utils/liveTransitRadar';
import { submitAuthenticCrowdCheckIn, speakTransitAnnouncement } from '../../utils/liveTransitRadar';

interface LiveTransitCountdownBannerProps {
  routeNumber: string;
  routeName: string;
  vehicleType: string;
  radarStatus: AuthenticRadarStatus;
  activeStopName: string;
  scheduledEtaMinutes: number;
  scheduledDepartureTime?: string;
  onRefreshRadar?: () => void;
  onReportSubmitted?: () => void;
}

export function LiveTransitCountdownBanner({
  routeNumber,
  routeName,
  vehicleType,
  radarStatus,
  activeStopName,
  scheduledEtaMinutes,
  scheduledDepartureTime,
  onRefreshRadar,
  onReportSubmitted,
}: LiveTransitCountdownBannerProps) {
  const [showCheckInModal, setShowCheckInModal] = useState<boolean>(false);
  const [selectedCrowd, setSelectedCrowd] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [rampWorking, setRampWorking] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const activeVehicle = radarStatus.activeVehicles[0];
  const isLive = radarStatus.hasLiveGps && !!activeVehicle;

  const handleAudioAnnouncement = () => {
    let speech = '';
    if (isLive) {
      speech = `Route ${routeNumber}, ${routeName}. Live vehicle ${activeVehicle.label} is active on the corridor. Wheelchair ramp is reported ${activeVehicle.hasRamp ? 'functional' : 'unavailable'}.`;
    } else {
      speech = `Route ${routeNumber}, ${routeName}. Operating on scheduled timetable. Next departure is in approximately ${scheduledEtaMinutes} minutes. No active transponder signal currently broadcasting.`;
    }
    speakTransitAnnouncement(speech);
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitAuthenticCrowdCheckIn({
        routeId: routeNumber,
        routeName,
        lat: 20.3533,
        lng: 85.8164,
        crowdingLevel: selectedCrowd,
        rampFunctional: rampWorking,
        comment: 'Verified on-board by commuter',
      });
      setSubmittedSuccess(true);
      if (onReportSubmitted) onReportSubmitted();
      setTimeout(() => {
        setShowCheckInModal(false);
        setSubmittedSuccess(false);
      }, 1500);
    } catch {
      setShowCheckInModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-sm text-neutral-900 transition-all font-sans">
      {/* Top Provenance & Signal Status Row */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live GPS Transponder</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              <span>Scheduled Timetable</span>
            </span>
          )}

          <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[190px] sm:max-w-none">
            {radarStatus.sourceAttribution}
          </span>
        </div>

        {/* Minimalist actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAudioAnnouncement}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center gap-1"
            title="Listen to Trip Info"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Listen</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCheckInModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-black text-white transition-colors flex items-center gap-1 shadow-sm"
            title="Crowdsource Live Status"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Check In</span>
          </button>
        </div>
      </div>

      {/* Main Information Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-neutral-950 tracking-tight">{routeNumber}</span>
            <span className="text-xs text-neutral-500 font-medium">{routeName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
            <span className="flex items-center gap-1 font-semibold text-neutral-900">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              {scheduledDepartureTime ? `Departure: ${scheduledDepartureTime}` : `ETA: ~${scheduledEtaMinutes} min`}
            </span>
            <span>•</span>
            <span>Boarding at <strong className="text-neutral-900 font-bold">{activeStopName || 'Origin Stop'}</strong></span>
          </div>
        </div>

        {/* Real-world Telemetry Tag or Timetable note */}
        <div className="sm:text-right shrink-0">
          {isLive ? (
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-800">
                {activeVehicle.label}
              </div>
              <div className="flex items-center sm:justify-end gap-2 text-[11px]">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {activeVehicle.hasRamp ? 'Wheelchair Ramp Verified' : 'Standard Boarding'}
                </span>
                {activeVehicle.speedKmh !== null && activeVehicle.speedKmh !== undefined && (
                  <span className="text-neutral-500 font-mono">
                    {activeVehicle.speedKmh} km/h
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-100 max-w-xs">
              Live GPS transponder offline for this vehicle. Showing authentic published timetable schedule.
            </div>
          )}
        </div>
      </div>

      {/* Crowdsourced Ground-Truth Summary if available */}
      {radarStatus.crowdsourcedCount > 0 && (
        <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <span className="flex items-center gap-1 text-[11px] text-neutral-700 font-medium">
            <Users className="w-3.5 h-3.5 text-neutral-500" />
            Verified by {radarStatus.crowdsourcedCount} commuter{radarStatus.crowdsourcedCount > 1 ? 's' : ''} on this route today
          </span>
          <span className="text-[11px] text-neutral-400 font-medium">
            {radarStatus.lastReportedText || 'Community verified'}
          </span>
        </div>
      )}

      {/* Clean Commuter Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-neutral-200 rounded-3xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-sm text-neutral-900">
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>Rider Ground-Truth Check-In</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckInModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Are you commuting on <strong>{routeNumber}</strong>? Help other commuters with legitimate real-time data:
            </p>

            <form onSubmit={handleCheckInSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Observed Crowding Level:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedCrowd(lvl)}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        selectedCrowd === lvl
                          ? 'bg-neutral-900 text-white border-black'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {lvl === 'LOW' ? 'Low' : lvl === 'MEDIUM' ? 'Moderate' : 'Crowded'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Wheelchair Ramp Status:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRampWorking(true)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      rampWorking
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ♿ Functional & Ready
                  </button>
                  <button
                    type="button"
                    onClick={() => setRampWorking(false)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      !rampWorking
                        ? 'bg-red-700 text-white border-red-800'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    ⚠️ Obstructed / Inactive
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || submittedSuccess}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {submittedSuccess ? '✓ Ground-Truth Recorded!' : isSubmitting ? 'Submitting...' : 'Submit Real-Time Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
