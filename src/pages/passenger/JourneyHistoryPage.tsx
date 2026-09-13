import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Card, Badge, Modal } from '../../components/ui';
import {
  MapPin, Clock, Calendar, ChevronRight, FileText,
  Shield, Check, Download, Printer, Leaf,
  ArrowRight, Lock
} from 'lucide-react';
import { RadialScore } from '../../components/ui';
import { isGuestAccount, getOrCreateCommuterPass } from '../../utils/authUtils';

const JourneyHistoryPage: React.FC = () => {
  const { state } = useAppStore();
  const { journeyHistory, currentUser } = state;
  const [selectedReceiptJourney, setSelectedReceiptJourney] = useState<any | null>(null);

  const isGuest = isGuestAccount(currentUser);
  const commuterPass = getOrCreateCommuterPass(currentUser);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
              Trip Receipts & Travel Log
            </span>
            {isGuest ? (
              <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                Local Session Cache
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                Cloud Synced Account
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Journey History
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Review past corridors, transit ratings, and official commuter e-receipts.
          </p>
        </div>

        {!isGuest && (
          <div className="bg-neutral-900 text-white px-4 py-2 rounded-2xl flex items-center gap-3 border border-neutral-800">
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Pass ID</div>
              <div className="text-xs font-mono font-bold text-emerald-400">{commuterPass.passId}</div>
            </div>
            <div className="h-6 w-px bg-neutral-800" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">CO₂ Saved</div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" />
                <span>{commuterPass.carbonSavedKg} kg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-neutral-200 rounded-3xl shadow-xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase">Total Trips</div>
          <div className="text-xl font-black text-neutral-900 mt-1">{journeyHistory?.length || 0} Trips</div>
          <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">
            {isGuest ? 'Local Session' : '✓ 100% Cloud Synced'}
          </div>
        </div>
        {!isGuest && (
          <>
            <div className="p-4 bg-white border border-neutral-200 rounded-3xl shadow-xs">
              <div className="text-[11px] font-bold text-neutral-500 uppercase">Carbon Offset</div>
              <div className="text-xl font-black text-emerald-600 mt-1">{commuterPass.carbonSavedKg} kg CO₂</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">By choosing transit & EV</div>
            </div>
            <div className="p-4 bg-white border border-neutral-200 rounded-3xl shadow-xs">
              <div className="text-[11px] font-bold text-neutral-500 uppercase">Pass Credit</div>
              <div className="text-xl font-black text-neutral-900 mt-1">₹{commuterPass.balanceRupees.toFixed(2)}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Active discount 10%</div>
            </div>
            <div className="p-4 bg-white border border-neutral-200 rounded-3xl shadow-xs">
              <div className="text-[11px] font-bold text-neutral-500 uppercase">Status</div>
              <div className="text-xl font-black text-neutral-900 mt-1">Verified</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">National Commuter</div>
            </div>
          </>
        )}
      </div>

      {/* History Items */}
      {!journeyHistory || journeyHistory.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center space-y-3">
          <Clock className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-lg font-bold text-neutral-900">No Journey History Recorded</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Completed trips, bike taxi rides, metro tickets, and bus routes will appear here.
          </p>
          <div className="pt-2">
            <Link to="/plan">
              <button className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-2xl">
                Plan a New Trip
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {journeyHistory.map((journey) => (
            <Card key={journey.id} className="p-0 hover:shadow-md transition-shadow border-neutral-200 rounded-3xl overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-neutral-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 truncate">
                      <span className="font-bold text-sm text-neutral-900 truncate">{journey.originName}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-bold text-sm text-neutral-900 truncate">{journey.destinationName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {journey.startedAt ? new Date(journey.startedAt).toLocaleDateString() : 'Recent'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {journey.duration} mins
                      </span>
                      <Badge variant={journey.status === 'completed' ? 'success' : 'neutral'} className="capitalize text-[10px]">
                        {journey.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-center">
                    <div className="text-[10px] text-neutral-500 mb-0.5 font-bold">Match Score</div>
                    <RadialScore score={journey.scores?.overall || 92} size="sm" />
                  </div>

                  {/* E-Receipt Action */}
                  {isGuest ? (
                    <button
                      disabled
                      className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 bg-neutral-100 px-3.5 py-2 rounded-xl cursor-not-allowed"
                      title="Sign in required for official e-receipt"
                    >
                      <Lock className="w-3 h-3 text-neutral-400" />
                      <span>E-Receipt</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedReceiptJourney(journey)}
                      className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3.5 py-2 rounded-xl transition-colors border border-neutral-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-700" />
                      <span>E-Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Official Printable E-Receipt Modal for Logged-In Commuters */}
      {selectedReceiptJourney && (
        <Modal
          open={!!selectedReceiptJourney}
          onClose={() => setSelectedReceiptJourney(null)}
          title="Official Commuter E-Receipt & Travel Proof"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Header & Logo */}
            <div className="p-4 bg-black text-white rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-base font-black tracking-tight">मार्ग Darshan</div>
                <div className="text-[10px] text-neutral-400">National Accessible Transit Platform</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  PAID & VERIFIED
                </span>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  {selectedReceiptJourney.id}
                </div>
              </div>
            </div>

            {/* Passenger & Pass Info */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-500 block">Passenger Name:</span>
                <strong className="text-neutral-900">{currentUser?.name || 'Verified Commuter'}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block">National Pass ID:</span>
                <strong className="text-neutral-900 font-mono">{commuterPass.passId}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Date & Time:</span>
                <strong className="text-neutral-900">
                  {selectedReceiptJourney.startedAt ? new Date(selectedReceiptJourney.startedAt).toLocaleString() : 'Today'}
                </strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Travel Duration:</span>
                <strong className="text-neutral-900">{selectedReceiptJourney.duration} mins</strong>
              </div>
            </div>

            {/* Corridor Path */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-500 block uppercase">Route Corridor</span>
              <div className="flex items-center gap-2 font-bold text-neutral-900 text-xs">
                <span>{selectedReceiptJourney.originName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                <span>{selectedReceiptJourney.destinationName}</span>
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-1.5 text-neutral-700 text-xs">
              <div className="flex justify-between">
                <span>Base Transit Fare:</span>
                <span>₹{(selectedReceiptJourney.fare?.exact || 25).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Commuter Pass Discount (10%):</span>
                <span>-₹{((selectedReceiptJourney.fare?.exact || 25) * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 text-[11px]">
                <span>Applicable GST (5%):</span>
                <span>₹{((selectedReceiptJourney.fare?.exact || 25) * 0.05).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between font-black text-sm text-neutral-900">
                <span>Total Amount Paid:</span>
                <span>₹{((selectedReceiptJourney.fare?.exact || 25) * 0.95).toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs text-neutral-800 hover:bg-neutral-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setSelectedReceiptJourney(null)}
                className="flex-1 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JourneyHistoryPage;
