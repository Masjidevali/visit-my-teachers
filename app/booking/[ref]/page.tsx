'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatTime, formatDate } from '@/lib/utils';
import QRCode from 'qrcode';

interface BookingDetails {
  bookingRef: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentId: string;
  className: string;
  teacherName: string;
  room: string;
  eventName: string;
  eventDate: string;
  createdAt: string;
}

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function BookingPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<number | null>(null);
  const [selectedNewSlot, setSelectedNewSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!booking) return;
    QRCode.toDataURL(booking.bookingRef, { width: 160, margin: 1 }).then(setQrDataUrl);
  }, [booking]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${ref}`);
      if (res.ok) {
        setBooking(await res.json());
      } else {
        setError('Booking not found. Please check your reference code.');
      }
      setLoading(false);
    }
    load();
  }, [ref]);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/bookings/${ref}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/?cancelled=true');
    } else {
      setError('Failed to cancel. Please try again.');
      setCancelling(false);
    }
  }

  async function openReschedule() {
    setShowReschedule(true);
    setLoadingSlots(true);
    setSelectedNewSlot(null);
    setRescheduleSuccess('');
    setError('');
    try {
      const res = await fetch(`/api/bookings/${ref}/slots`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots);
        setCurrentSlotId(data.currentSlotId);
      } else {
        setError('Failed to load available slots.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleReschedule() {
    if (!selectedNewSlot) return;
    setRescheduling(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings/${ref}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSlotId: selectedNewSlot.id }),
      });
      if (res.ok) {
        setRescheduleSuccess(`Rescheduled to ${formatTime(selectedNewSlot.startTime)} - ${formatTime(selectedNewSlot.endTime)}`);
        setShowReschedule(false);
        // Refresh booking details
        const refreshRes = await fetch(`/api/bookings/${ref}`);
        if (refreshRes.ok) {
          setBooking(await refreshRes.json());
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reschedule. Please try again.');
        openReschedule();
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setRescheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-primary header-pattern text-white py-6 px-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-6 w-40 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto w-full px-4 py-8 animate-pulse">
          <div className="bg-card rounded-xl border border-card-border p-6">
            <div className="flex justify-between mb-6">
              <div className="h-5 w-36 bg-muted-bg rounded" />
              <div className="h-6 w-20 bg-muted-bg rounded-full" />
            </div>
            <div className="space-y-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-card-border">
                  <div className="h-4 w-20 bg-muted-bg rounded" />
                  <div className="h-4 w-28 bg-muted-bg rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary header-pattern text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <img src="/logo.png" alt="" className="w-12 h-12 rounded-full bg-white/95 p-1 shadow object-contain shrink-0" />
          <div>
            <Link href="/" className="text-sm text-white/60 hover:text-white">&larr; Back to Home</Link>
            <h1 className="text-2xl font-bold mt-1 tracking-tight">Booking Details</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        {error && !booking && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">{error}</p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary underline">Go Home</Link>
          </div>
        )}

        {booking && (
          <div className="bg-card rounded-xl shadow-sm border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-heading">Your Appointment</h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Confirmed</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Booking Ref</span>
                <span className="font-mono font-bold text-primary">{booking.bookingRef}</span>
              </div>
              {qrDataUrl && (
                <div className="py-3 border-b border-card-border text-center">
                  <img src={qrDataUrl} alt="QR code for check-in" className="mx-auto w-28 h-28 rounded" />
                  <p className="text-xs text-muted mt-1">Show on arrival for check-in</p>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Student</span>
                <span className="font-medium text-heading">{booking.studentName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Class</span>
                <span className="font-medium text-heading">{booking.className}</span>
              </div>
              {booking.teacherName && (
                <div className="flex justify-between py-2 border-b border-card-border">
                  <span className="text-secondary">Teacher</span>
                  <span className="font-medium text-heading">{booking.teacherName}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Date</span>
                <span className="font-medium text-heading">{formatDate(booking.eventDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Time</span>
                <span className="font-medium text-heading">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
              </div>
              {booking.room && (
                <div className="flex justify-between py-2 border-b border-card-border">
                  <span className="text-secondary">Room</span>
                  <span className="font-medium text-heading">{booking.room}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-card-border">
                <span className="text-secondary">Parent</span>
                <span className="font-medium text-heading">{booking.parentName}</span>
              </div>
            </div>

            {/* Reschedule Success */}
            {rescheduleSuccess && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">{rescheduleSuccess}</p>
                <p className="text-xs text-green-600 mt-1">A confirmation email has been sent.</p>
              </div>
            )}

            {/* Reschedule Section */}
            <div className="mt-6 pt-6 border-t border-card-border">
              {!showReschedule ? (
                <button
                  onClick={openReschedule}
                  className="w-full py-2 px-4 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/5 transition-colors"
                >
                  Change Time
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm text-heading">Select a New Time</h3>
                    <button
                      onClick={() => { setShowReschedule(false); setSelectedNewSlot(null); }}
                      className="text-xs text-secondary hover:text-body"
                    >
                      Cancel
                    </button>
                  </div>
                  {loadingSlots ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {availableSlots.map(slot => {
                          const isCurrent = slot.id === currentSlotId;
                          const isSelected = selectedNewSlot?.id === slot.id;
                          const isDisabled = !slot.isAvailable && !isCurrent;
                          const avail = availableSlots.filter(s => s.isAvailable).length;
                          const pct = availableSlots.length > 0 ? avail / availableSlots.length : 0;
                          const heatBorder = pct > 0.6 ? 'border-green-300 hover:border-green-500' : pct >= 0.2 ? 'border-amber-300 hover:border-amber-500' : 'border-red-300 hover:border-red-500';
                          return (
                            <button
                              key={slot.id}
                              disabled={isDisabled || isCurrent}
                              onClick={() => setSelectedNewSlot(slot)}
                              className={`py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                                isCurrent
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed'
                                  : isDisabled
                                    ? 'bg-muted-bg text-muted border-card-border cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-primary text-white border-primary shadow-md'
                                      : `bg-card text-body ${heatBorder} hover:text-primary`
                              }`}
                            >
                              {formatTime(slot.startTime)}
                              {isCurrent && <span className="block text-[10px]">Current</span>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedNewSlot && (
                        <button
                          onClick={handleReschedule}
                          disabled={rescheduling}
                          className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
                        >
                          {rescheduling ? 'Rescheduling...' : `Confirm: ${formatTime(selectedNewSlot.startTime)} - ${formatTime(selectedNewSlot.endTime)}`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cancel Section */}
            <div className="mt-4 pt-4 border-t border-card-border">
              {!showConfirmCancel ? (
                <button
                  onClick={() => setShowConfirmCancel(true)}
                  className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  Cancel This Booking
                </button>
              ) : (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">Are you sure you want to cancel this booking? The time slot will be released for others to book.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                    <button
                      onClick={() => setShowConfirmCancel(false)}
                      className="flex-1 py-2 bg-card border border-card-border text-body rounded-lg text-sm font-medium hover:bg-muted-bg"
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
