import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { useToast } from '../../store/ToastContext';
import { Button, Modal, Input } from '../../components/ui';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Navigation, Clock, Bus, MapPin, CheckCircle, ShieldAlert,
  ShieldCheck, ArrowRight, Check, Sparkles, AlertTriangle,
  MessageSquarePlus, Phone, Share2, AlertOctagon, X, Star,
  ThumbsUp, Award, Volume2, Footprints, Play, Pause, RefreshCw
} from 'lucide-react';
import { haversineDistanceClient } from '../../utils/onlineRouting';
import { safetyApi, reportsApi } from '../../api';

// Custom Map Pins
const createMapPin = (color: string, label: string) =>
  L.divIcon({
    className: 'custom-nav-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border: 2.5px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const originPin = createMapPin('#10b981', 'A');
const destPin = createMapPin('#ef4444', 'B');
const userGpsPin = createMapPin('#000000', '📍');

function NavBoundsController({
  coordinates,
  currentPos,
}: {
  coordinates: Array<[number, number]>;
  currentPos: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates);
        bounds.extend(currentPos);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        // ignore bounds fit error
      }
    }
  }, [coordinates, currentPos, map]);

  return null;
}

export default function ActiveJourneyPage() {
  const navigate = useNavigate();
  const { state, completeJourney, addNotification, setUser, updateCondition } = useAppStore();
  const { addToast } = useToast();
  const { activeJourney } = state;

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showEmergencySetupModal, setShowEmergencySetupModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [hasArrivedSafely, setHasArrivedSafely] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // Emergency contact inputs for setup modal
  const [contactName, setContactName] = useState<string>(state.currentUser?.emergencyContact?.name || '');
  const [contactPhone, setContactPhone] = useState<string>(state.currentUser?.emergencyContact?.phone || '');
  const [contactRelation, setContactRelation] = useState<string>(state.currentUser?.emergencyContact?.relationship || 'Family');

  // Real GPS & Live Movement State
  const [isSimulatingDemo, setIsSimulatingDemo] = useState<boolean>(false);
  const [simProgressIndex, setSimProgressIndex] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [remainingDistMeters, setRemainingDistMeters] = useState<number>(1200);

  // Dynamic Post-Ride Feedback Form State
  const [crowdFeedback, setCrowdFeedback] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [roadSurfaceFeedback, setRoadSurfaceFeedback] = useState<'smooth' | 'minor_bumps' | 'rough'>('smooth');
  const [rampFeedback, setRampFeedback] = useState<'working' | 'issue' | 'not_used'>('working');
  const [announcementsFeedback, setAnnouncementsFeedback] = useState<'working' | 'not_working'>('working');
  const [starRating, setStarRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [fareAccuracyFeedback, setFareAccuracyFeedback] = useState<'exact' | 'overcharged'>('exact');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Safe Coordinates Calculation
  const fullRouteArr: Array<[number, number]> = activeJourney?.geometry?.fullRoute || [];
  const originCoords: [number, number] =
    fullRouteArr.length > 0 ? fullRouteArr[0] : [20.3555, 85.8145];
  const destCoords: [number, number] =
    fullRouteArr.length > 0 ? fullRouteArr[fullRouteArr.length - 1] : [20.3450, 85.8180];

  const continuousRoute: Array<[number, number]> =
    fullRouteArr.length > 0 ? fullRouteArr : [originCoords, destCoords];

  // Identify Transit Mode
  const isBus =
    activeJourney?.routeId === 'C3' ||
    activeJourney?.routeId === 'C2' ||
    (activeJourney?.routeName || '').toLowerCase().includes('bus');

  const isAutoOrCab =
    activeJourney?.routeId === 'AUTO_DIRECT' ||
    activeJourney?.routeId === 'S1' ||
    (activeJourney?.routeName || '').toLowerCase().includes('auto') ||
    (activeJourney?.routeName || '').toLowerCase().includes('taxi');

  // =========================================================================
  // STRICT REAL-WORLD GPS TRACKING (NO JUMPING / NO AUTO MOVING WHEN STATIONARY)
  // =========================================================================
  useEffect(() => {
    if (!activeJourney || hasArrivedSafely) return;

    if (!isSimulatingDemo) {
      // 1. Fetch initial real GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation([lat, lng]);

            const dist = Math.round(haversineDistanceClient(lat, lng, destCoords[0], destCoords[1]));
            setRemainingDistMeters(dist);

            if (dist <= 30 && !hasArrivedSafely) {
              triggerSafeArrival();
            }
          },
          (err) => {
            console.warn('Initial GPS check:', err);
            if (!userLocation) setUserLocation(originCoords);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );

        // 2. Watch real GPS movement strictly (does NOT move if user is stationary)
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation([lat, lng]);

            const dist = Math.round(haversineDistanceClient(lat, lng, destCoords[0], destCoords[1]));
            setRemainingDistMeters(dist);

            // Auto-complete ride if within 30 meters of destination
            if (dist <= 30 && !hasArrivedSafely) {
              triggerSafeArrival();
            }
          },
          (err) => {
            console.warn('Live GPS watcher:', err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
      } else {
        if (!userLocation) setUserLocation(originCoords);
      }
    }
  }, [activeJourney, destCoords, hasArrivedSafely, isSimulatingDemo, originCoords, userLocation]);

  // =========================================================================
  // OPTIONAL DEMO SIMULATION (Runs ONLY when user explicitly toggles Demo Drive)
  // =========================================================================
  useEffect(() => {
    if (!isSimulatingDemo || hasArrivedSafely) return;

    const demoInterval = setInterval(() => {
      setSimProgressIndex((prev) => {
        const next = Math.min(prev + 1, continuousRoute.length - 1);
        const nextPoint = continuousRoute[next];
        if (nextPoint) {
          setUserLocation(nextPoint);
          const dist = Math.round(haversineDistanceClient(nextPoint[0], nextPoint[1], destCoords[0], destCoords[1]));
          setRemainingDistMeters(dist);

          if ((dist <= 30 || next >= continuousRoute.length - 1) && !hasArrivedSafely) {
            triggerSafeArrival();
          }
        }
        return next;
      });
    }, 2500);

    return () => clearInterval(demoInterval);
  }, [isSimulatingDemo, continuousRoute, destCoords, hasArrivedSafely]);

  // Trigger Automatic Destination Arrival
  const triggerSafeArrival = () => {
    setHasArrivedSafely(true);
    setIsSimulatingDemo(false);

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}

    addNotification({
      id: `arr-${Date.now()}`,
      title: 'Destination Reached 🎉',
      message: `You have safely arrived at ${activeJourney?.destinationName || 'your destination'}. Please submit quick feedback to update live conditions for other commuters.`,
      type: 'safety',
      timestamp: new Date().toISOString(),
      read: false,
    });

    addToast('success', `🎉 Destination Reached! Arrived safely at ${activeJourney?.destinationName || 'Destination'}.`);
  };

  // Cancel Journey Confirmation Handler
  const handleCancelJourney = () => {
    completeJourney();
    setShowCancelModal(false);
    addToast('info', 'Ride navigation cancelled.');
    navigate('/plan');
  };

  // Submit Feedback and Update the Live System for New Users
  const handleSubmitFeedback = async () => {
    setFeedbackSubmitted(true);

    const routeId = activeJourney?.routeId || 'C3';

    // 1. Update live conditions in store cache so all subsequent searches reflect this real-time
    updateCondition(routeId, {
      crowding: crowdFeedback,
      accessibility: rampFeedback === 'working' ? 'AVAILABLE' : 'LIMITED',
      delay: 0,
    });

    // 2. Submit to backend crowding and accessibility triage
    try {
      await reportsApi.submitCrowdingFeedback({
        routeId,
        level: crowdFeedback,
        journeyId: activeJourney?.id,
      });

      if (rampFeedback === 'issue') {
        await reportsApi.submitAccessibility({
          routeId,
          type: 'RAMP',
          issue: 'Ramp operational difficulty reported by passenger upon destination arrival',
          comment: feedbackComment,
        });
      }
    } catch (e) {
      console.warn('Feedback dispatch fallback to local state update', e);
    }

    // 3. Award Karma Contribution Points
    addToast(
      'success',
      `🌟 Feedback Submitted! You earned +50 Karma Points. Live conditions updated for all commuters in Bhubaneswar.`
    );

    // 4. Complete Journey & Save to History
    completeJourney();
    navigate('/plan');
  };

  const livePos: [number, number] =
    userLocation || continuousRoute[simProgressIndex] || originCoords;

  // Handle SOS Click - Strictly check for valid user-provided phone number
  const handleSosClick = () => {
    const currentPhone = state.currentUser?.emergencyContact?.phone;
    if (!currentPhone || currentPhone.replace(/[^0-9]/g, '').length < 10) {
      setShowEmergencySetupModal(true);
      return;
    }
    dispatchEmergencyAlert();
  };

  // Save Real User Contact Details
  const handleSaveContact = async () => {
    const rawDigits = contactPhone.replace(/[^0-9]/g, '');
    if (rawDigits.length < 10) {
      addToast('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanPhone = `+91 ${rawDigits.slice(-10)}`;
    const updatedContact = {
      name: contactName.trim() || 'Primary Contact',
      phone: cleanPhone,
      relationship: contactRelation || 'Family',
    };

    if (state.currentUser) {
      setUser({
        ...state.currentUser,
        emergencyContact: updatedContact,
      });
    }

    setShowEmergencySetupModal(false);
    addToast('success', `Saved ${updatedContact.name} (${cleanPhone}) as your emergency contact.`);
    dispatchEmergencyAlert();
  };

  // Dispatch live emergency alert
  const dispatchEmergencyAlert = async () => {
    setSosActive(true);
    const activeContact = state.currentUser?.emergencyContact || {
      name: contactName || 'Primary Contact',
      phone: contactPhone || '9876543210',
    };

    const rawDigitsPhone = activeContact.phone.replace(/[^0-9]/g, '').slice(-10);
    const coordsStr = `${livePos[0].toFixed(5)}, ${livePos[1].toFixed(5)}`;
    const physicalSmsText = `🚨 EMERGENCY ALERT: ${state.currentUser?.name || 'I'} triggered SOS near ${activeJourney?.originName || 'Bhubaneswar'}. Live Google Maps: https://maps.google.com/?q=${livePos[0].toFixed(5)},${livePos[1].toFixed(5)}`;
    const nativeSmsUri = `sms:${rawDigitsPhone}?body=${encodeURIComponent(physicalSmsText)}`;
    const whatsAppUri = `https://api.whatsapp.com/send?phone=91${rawDigitsPhone}&text=${encodeURIComponent(physicalSmsText)}`;

    // 1. Send to backend & Fast2SMS API gateway
    try {
      await safetyApi.sendEmergencySms({
        recipientPhone: rawDigitsPhone,
        recipientName: activeContact.name,
        senderName: state.currentUser?.name || 'Passenger',
        latitude: livePos[0],
        longitude: livePos[1],
        locationName: activeJourney?.originName || 'Bhubaneswar Transit Route',
      });
    } catch (err) {
      console.warn('API Gateway error:', err);
    }

    // 2. Automatically launch native device SMS app / carrier composer
    try {
      window.location.href = nativeSmsUri;
    } catch (e) {
      console.warn('Native SMS launcher:', e);
    }

    const sosMessage = `🚨 REAL-TIME EMERGENCY SOS DISPATCHED: Live GPS location (${coordsStr}) prepared for ${activeContact.name} (${activeContact.phone}) and Transit Dispatch.`;

    addNotification({
      id: `sos-${Date.now()}`,
      title: '🚨 EMERGENCY SOS DISPATCHED',
      message: sosMessage,
      type: 'safety',
      timestamp: new Date().toISOString(),
      read: false,
    });

    addToast('error', `🚨 EMERGENCY SMS PREPARED: Live GPS (${coordsStr}) ready to send to ${activeContact.phone}!`);
  };

  if (!activeJourney && !hasArrivedSafely) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4 font-sans">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
          <Navigation className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-neutral-900">No Active Journey</h2>
        <p className="text-xs text-neutral-500">
          You don't have any navigation session in progress right now.
        </p>
        <Button onClick={() => navigate('/plan')} size="sm">
          Plan a Trip
        </Button>
      </div>
    );
  }

  const currentStep =
    activeJourney?.turnByTurn?.[Math.min(simProgressIndex, (activeJourney?.turnByTurn?.length || 1) - 1)] ||
    'Proceed along step-free transit corridor to destination.';

  // =========================================================================
  // POST-RIDE EXPERIENCE: SMART CROWDSOURCED FEEDBACK FORM & REWARD
  // =========================================================================
  if (hasArrivedSafely) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10 space-y-5 font-sans">
        {/* Celebration Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto shadow-md animate-bounce">
            <CheckCircle className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
            Verified Destination Arrival 🎉
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            You Have Arrived!
          </h1>
          <p className="text-xs text-neutral-600 max-w-sm mx-auto">
            Safely reached <strong>{activeJourney?.destinationName}</strong> via <strong>{activeJourney?.routeName}</strong>.
          </p>
        </div>

        {/* Crowdsourced Feedback Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black text-neutral-900 uppercase tracking-wider">
                Help Commuters • Live Feedback
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              +50 Karma Points
            </span>
          </div>

          {/* Question 1: Crowding Level (For Public Bus) or Star Rating (For Auto/Cab) */}
          {isBus ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                1. How crowded was the bus during your journey?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'LOW', label: '🟢 Low', desc: 'Empty Seats' },
                  { id: 'MEDIUM', label: '🟡 Medium', desc: 'Some Standing' },
                  { id: 'HIGH', label: '🔴 High', desc: 'Packed Bus' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCrowdFeedback(c.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      crowdFeedback === c.id
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="text-xs font-bold block">{c.label}</span>
                    <span className={`text-[10px] block mt-0.5 ${crowdFeedback === c.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {c.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                1. How was your ride experience?
              </label>
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= starRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2: Road / Sidewalk Surface (Was the road plane/smooth?) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800">
              2. Was the road and sidewalk surface smooth & plane?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smooth', label: '🟢 Smooth / Plane', desc: 'Tactile Paved' },
                { id: 'minor_bumps', label: '🟡 Minor Bumps', desc: 'Usable' },
                { id: 'rough', label: '🔴 Uneven / Potholes', desc: 'Rough Surface' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setRoadSurfaceFeedback(s.id as any)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    roadSurfaceFeedback === s.id
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-xs font-bold block">{s.label}</span>
                  <span className={`text-[10px] block mt-0.5 ${roadSurfaceFeedback === s.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {s.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Ramp Condition (If Public Bus) or Fare (If Auto/Cab) */}
          {isBus ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                3. Low-Floor Wheelchair Ramp status:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'working', label: '♿ Deployed Smoothly' },
                  { id: 'issue', label: '⚠️ Issue / Stiff' },
                  { id: 'not_used', label: '⚪ Not Observed' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRampFeedback(r.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition-all text-xs font-bold ${
                      rampFeedback === r.id
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                3. Fare charged by driver:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'exact', label: '✅ Exact Meter / Estimated' },
                  { id: 'overcharged', label: '⚠️ Asked Extra' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFareAccuracyFeedback(f.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition-all text-xs font-bold ${
                      fareAccuracyFeedback === f.id
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Quick Comment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700">
              Additional Notes for Commuters (Optional)
            </label>
            <input
              type="text"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="e.g. Bus stop shade clean, gentle curb cuts..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-900 focus:bg-white focus:border-black focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={handleSubmitFeedback}
              size="lg"
              className="w-full py-4 bg-black hover:bg-neutral-800 text-white font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Submit & Update Live Community Data</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <button
              type="button"
              onClick={() => {
                completeJourney();
                navigate('/plan');
              }}
              className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 text-center"
            >
              Skip Feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeContact = state.currentUser?.emergencyContact || {
    name: 'Emergency Contact',
    phone: '+91 98765 43210',
  };

  const rawPhone = activeContact.phone.replace(/[^0-9]/g, '').slice(-10);
  const physicalSmsText = `🚨 EMERGENCY ALERT: ${state.currentUser?.name || 'I'} triggered SOS near ${activeJourney?.originName || 'Bhubaneswar'}. Live Google Maps: https://maps.google.com/?q=${livePos[0].toFixed(5)},${livePos[1].toFixed(5)}`;
  const nativeSmsUri = `sms:${rawPhone}?body=${encodeURIComponent(physicalSmsText)}`;
  const whatsAppUri = `https://api.whatsapp.com/send?phone=91${rawPhone}&text=${encodeURIComponent(physicalSmsText)}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-4 font-sans">
      {/* Active SOS Red Emergency Bar if Triggered */}
      {sosActive && (
        <div className="bg-red-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-white animate-spin" />
              <span className="font-black text-sm uppercase tracking-wider">
                🚨 Emergency SOS Active
              </span>
            </div>
            <button
              onClick={() => setSosActive(false)}
              className="p-1 rounded-full hover:bg-red-700 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-red-100 leading-relaxed">
            Live GPS ({livePos[0].toFixed(5)}, {livePos[1].toFixed(5)}) prepared for <strong>{activeContact.name} ({activeContact.phone})</strong> and Transit Dispatch.
          </div>

          {/* 1-Tap Immediate SIM Carrier Dispatch Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <a
              href={nativeSmsUri}
              className="py-2.5 px-2 rounded-xl bg-white text-red-900 font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-neutral-100"
            >
              <Phone className="w-3.5 h-3.5" /> Send SMS
            </a>

            <a
              href={whatsAppUri}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-2 rounded-xl bg-emerald-700 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-emerald-800"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp Pin
            </a>

            <a
              href={`tel:${activeContact.phone}`}
              className="py-2.5 px-2 rounded-xl bg-neutral-900 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-black"
            >
              <Phone className="w-3.5 h-3.5" /> Call Contact
            </a>

            <a
              href="tel:112"
              className="py-2.5 px-2 rounded-xl bg-red-950 text-white font-black text-xs text-center flex items-center justify-center gap-1 shadow-md hover:bg-black"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Call 112
            </a>
          </div>

          <p className="text-[10px] text-red-200/90 pt-1 border-t border-red-500/50 leading-normal">
            💡 Tap <strong>Send SMS</strong> or <strong>WhatsApp Pin</strong> to dispatch directly from your device SIM free of charge.
          </p>
        </div>
      )}

      {/* Top Turn-by-Turn Instruction Banner with Cancel Button */}
      <div className="bg-black text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {isSimulatingDemo ? 'Demo Drive Simulation' : 'Live GPS Tracking'} • {activeJourney?.routeName}
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-neutral-800 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
              {remainingDistMeters > 1000 ? `${(remainingDistMeters / 1000).toFixed(1)} km away` : `${remainingDistMeters}m away`}
            </span>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-[11px] font-bold transition-colors"
            >
              ✕ Cancel
            </button>
          </div>
        </div>

        {/* Big Next Maneuver Instruction */}
        <div className="pt-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
            Current Action:
          </span>
          <p className="text-base sm:text-lg font-black text-white leading-snug mt-0.5">
            {currentStep}
          </p>
        </div>

        {/* Live Progress Bar */}
        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(
                100,
                Math.round(((simProgressIndex + 1) / Math.max(1, continuousRoute.length)) * 100)
              )}%`,
            }}
          />
        </div>
      </div>

      {/* CartoDB Voyager Live Interactive Map */}
      <div className="h-[280px] sm:h-[340px] w-full rounded-3xl overflow-hidden border border-neutral-200 shadow-sm relative z-0 isolate">
        <MapContainer
          center={livePos}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <NavBoundsController coordinates={continuousRoute} currentPos={livePos} />

          {/* Start Marker A */}
          <Marker position={originCoords} icon={originPin}>
            <Popup>
              <span className="text-xs font-bold">Start (A): {activeJourney?.originName}</span>
            </Popup>
          </Marker>

          {/* Vibrant Blue Continuous Route Line */}
          <Polyline positions={continuousRoute} color="#2563eb" weight={6} opacity={0.9} />

          {/* Real-Time Live User GPS Pin */}
          <Marker position={livePos} icon={userGpsPin}>
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <strong className="block font-black text-black">📍 Your Current Position</strong>
                <span className="text-[10px] text-neutral-600 block">
                  {remainingDistMeters}m to destination ({isSimulatingDemo ? 'Demo Mode' : 'Real GPS Active'})
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker B */}
          <Marker position={destCoords} icon={destPin}>
            <Popup>
              <span className="text-xs font-bold">Destination (B): {activeJourney?.destinationName}</span>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Live GPS Status & Demo Toggle Controls */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-bold text-neutral-900 shadow-md flex items-center gap-2 pointer-events-auto">
            <span className={`w-2.5 h-2.5 rounded-full ${isSimulatingDemo ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
            <span>{isSimulatingDemo ? 'Demo Drive Active' : 'Real GPS Stationary'}</span>
          </div>

          {/* Optional Simulation Button to test auto-complete without walking */}
          <button
            type="button"
            onClick={() => setIsSimulatingDemo(!isSimulatingDemo)}
            className="bg-neutral-900/90 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md backdrop-blur-md pointer-events-auto flex items-center gap-1.5 transition-all"
          >
            {isSimulatingDemo ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            <span>{isSimulatingDemo ? 'Pause Demo' : 'Test Drive Demo'}</span>
          </button>
        </div>
      </div>

      {/* Safety & Action Controls HUD */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Red SOS Button */}
        <button
          onClick={handleSosClick}
          className="p-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs shadow-md active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <ShieldAlert className="w-5 h-5 text-white" />
          <span>Emergency SOS</span>
        </button>

        {/* Report Issue Button */}
        <button
          onClick={() => setShowReportModal(true)}
          className="p-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-2xl font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <MessageSquarePlus className="w-5 h-5 text-neutral-700" />
          <span>Report Issue</span>
        </button>

        {/* Complete Ride Manual Override */}
        <button
          onClick={triggerSafeArrival}
          className="p-3.5 bg-black hover:bg-neutral-800 text-white rounded-2xl font-bold text-xs shadow-md active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>Arrived at Stop</span>
        </button>
      </div>

      {/* Cancel Ride Confirmation Modal */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Active Navigation?"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-neutral-600 leading-relaxed">
            Are you sure you want to cancel this navigation session? Live route tracking will stop and you will return to the trip planner.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancelModal(false)}
              className="py-2.5 font-bold"
            >
              Keep Navigating
            </Button>

            <button
              onClick={handleCancelJourney}
              className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Yes, Cancel Ride
            </button>
          </div>
        </div>
      </Modal>

      {/* Emergency Contact Setup Modal */}
      <Modal
        open={showEmergencySetupModal}
        onClose={() => setShowEmergencySetupModal(false)}
        title="Set Your Emergency Contact"
        size="sm"
      >
        <div className="space-y-3.5 text-xs">
          <p className="text-neutral-600">
            Please provide your verified emergency contact details. Live GPS location will be sent to this number when SOS is pressed.
          </p>

          <div className="space-y-1">
            <label className="block font-bold text-neutral-700 text-[11px] uppercase">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Father, Sister, Friend..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black font-bold text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-neutral-700 text-[11px] uppercase">
              10-Digit Mobile Number
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              maxLength={15}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black font-bold text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-neutral-700 text-[11px] uppercase">
              Relationship
            </label>
            <select
              value={contactRelation}
              onChange={(e) => setContactRelation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs"
            >
              <option value="Family">Family Member</option>
              <option value="Friend">Friend</option>
              <option value="Doctor">Doctor / Caregiver</option>
              <option value="Colleague">Colleague</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmergencySetupModal(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveContact}>
              Save & Send Alert
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mid-Trip Report Issue Modal */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report Transit Condition"
        size="sm"
      >
        <div className="space-y-3 text-xs">
          <p className="text-neutral-600">
            Notice an issue on this route? Help update the system for other travellers.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                updateCondition(activeJourney?.routeId || 'C3', { crowding: 'HIGH' });
                addToast('success', 'High crowding reported! Other commuters alerted.');
                setShowReportModal(false);
              }}
              className="p-3 rounded-xl border border-neutral-200 hover:border-black text-left space-y-0.5"
            >
              <strong className="block font-bold text-neutral-900">🔴 High Crowding</strong>
              <span className="text-[10px] text-neutral-500">Packed bus / stand</span>
            </button>

            <button
              onClick={() => {
                updateCondition(activeJourney?.routeId || 'C3', { accessibility: 'LIMITED' });
                addToast('warning', 'Ramp / accessibility issue reported.');
                setShowReportModal(false);
              }}
              className="p-3 rounded-xl border border-neutral-200 hover:border-black text-left space-y-0.5"
            >
              <strong className="block font-bold text-neutral-900">⚠️ Ramp Issue</strong>
              <span className="text-[10px] text-neutral-500">Ramp inaccessible</span>
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={() => setShowReportModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
