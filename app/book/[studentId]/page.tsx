'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatTime, isValidUKPhone } from '@/lib/utils';
import { ProgressStepper } from '@/app/components/ProgressStepper';

interface StudentInfo {
  id: number;
  studentId: string;
  name: string;
  className: string;
  teacherName: string;
  room: string;
  eventDate: string;
  eventName: string;
}

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface ExistingBooking {
  bookingRef: string;
  startTime: string;
  endTime: string;
}

export default function BookPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [existingBooking, setExistingBooking] = useState<ExistingBooking | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking form — pre-fill from search params (multi-child flow)
  const [parentName, setParentName] = useState(searchParams.get('parentName') || '');
  const [parentPhone, setParentPhone] = useState(searchParams.get('parentPhone') || '');
  const [parentEmail, setParentEmail] = useState(searchParams.get('parentEmail') || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Special request
  const [needsSpecial, setNeedsSpecial] = useState(false);
  const [requestType, setRequestType] = useState('telephone_call');
  const [reason, setReason] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [translatorLanguage, setTranslatorLanguage] = useState('');

  useEffect(() => {
    async function lookup() {
      try {
        const res = await fetch('/api/students/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: decodeURIComponent(studentId) }),
        });

        if (!res.ok) {
          router.push('/');
          return;
        }

        const data = await res.json();
        setStudent(data.student);
        setSlots(data.slots);
        setExistingBooking(data.existingBooking);
      } catch {
        setError('Failed to load. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    lookup();
  }, [studentId, router]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !student) return;

    if (!isValidUKPhone(parentPhone)) {
      setError('Please enter a valid UK mobile number (e.g. 07xxx xxxxxx).');
      return;
    }

    if (needsSpecial && requestType === 'telephone_call' && contactNumber && !isValidUKPhone(contactNumber)) {
      setError('Please enter a valid UK mobile number for the contact number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          studentId: student.id,
          parentName,
          parentPhone,
          parentEmail,
          notes,
          ...(needsSpecial && reason.trim() ? { specialRequest: requestType } : {}),
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error);
        // Refresh slots
        const refreshRes = await fetch('/api/students/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: decodeURIComponent(studentId) }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setSlots(refreshData.slots);
          setSelectedSlot(null);
        }
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      // Submit special request if needed
      if (needsSpecial && reason.trim()) {
        await fetch('/api/special-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            parentName,
            parentEmail,
            parentPhone,
            requestType,
            reason,
            bookingId: data.booking.id,
            contactNumber: requestType === 'telephone_call' ? contactNumber : requestType === 'translator' ? translatorLanguage : '',
          }),
        });
      }

      // Redirect to confirmation
      const confirmParams = new URLSearchParams({ ref: data.booking.bookingRef });
      if (needsSpecial && reason.trim()) {
        const typeLabels: Record<string, string> = { telephone_call: 'Telephone Call', translator: 'Translator Needed', other: 'Other' };
        confirmParams.set('specialRequest', typeLabels[requestType] || requestType);
      }
      router.push(`/book/confirm?${confirmParams.toString()}`);
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-primary header-pattern text-white py-6 px-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-white/20 rounded animate-pulse" />
              <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto w-full px-4 py-8 animate-pulse">
          <div className="bg-card rounded-xl border border-card-border p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-muted-bg rounded" />
                  <div className="h-4 w-32 bg-muted-bg rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-5 w-40 bg-muted-bg rounded mb-3" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted-bg rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-secondary">Student not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary header-pattern text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <img src="/logo.png" alt="" className="w-12 h-12 rounded-full bg-white/95 p-1 shadow object-contain shrink-0" />
          <div>
            <button onClick={() => router.push('/')} className="text-sm text-white/60 hover:text-white mb-1 block">&larr; Back</button>
            <h1 className="text-2xl font-bold tracking-tight">{student.eventName}</h1>
          </div>
        </div>
      </header>

      <ProgressStepper currentStep={2} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Student Info */}
        <div className="bg-card rounded-xl shadow-sm border border-card-border p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-secondary">Student:</span>
              <p className="font-medium text-heading">{student.name}</p>
            </div>
            <div>
              <span className="text-secondary">Class:</span>
              <p className="font-medium text-heading">{student.className}</p>
            </div>
            {student.teacherName && (
              <div>
                <span className="text-secondary">Teacher:</span>
                <p className="font-medium text-heading">{student.teacherName}</p>
              </div>
            )}
            <div>
              <span className="text-secondary">Date:</span>
              <p className="font-medium text-heading">{new Date(student.eventDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Existing Booking Warning */}
        {existingBooking && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-amber-800">You already have a booking</h3>
            <p className="text-amber-700 text-sm mt-1">
              Time: {formatTime(existingBooking.startTime)} - {formatTime(existingBooking.endTime)}
            </p>
            <p className="text-amber-700 text-sm">
              Reference: <span className="font-mono font-bold">{existingBooking.bookingRef}</span>
            </p>
            <button
              onClick={() => router.push(`/booking/${existingBooking.bookingRef}`)}
              className="mt-3 text-sm text-amber-800 underline hover:no-underline"
            >
              View or cancel this booking
            </button>
          </div>
        )}

        {/* Slot Selection */}
        {!existingBooking && (
          <>
            <h2 className="text-lg font-semibold text-heading mb-2">Choose a Time Slot</h2>
            {(() => {
              const available = slots.filter(s => s.isAvailable).length;
              const pct = slots.length > 0 ? available / slots.length : 0;
              const heatColor = pct > 0.6 ? 'text-green-600' : pct >= 0.2 ? 'text-amber-600' : 'text-red-600';
              const heatBg = pct > 0.6 ? 'bg-green-600' : pct >= 0.2 ? 'bg-amber-500' : 'bg-red-600';
              const heatLabel = pct > 0.6 ? 'Plenty available' : pct >= 0.2 ? 'Filling up' : 'Nearly full';
              return (
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${heatBg}`} />
                  <span className={`text-xs font-medium ${heatColor}`}>{heatLabel} ({available} of {slots.length} slots)</span>
                </div>
              );
            })()}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-8">
              {slots.map(slot => {
                const available = slots.filter(s => s.isAvailable).length;
                const pct = slots.length > 0 ? available / slots.length : 0;
                const heatBorder = pct > 0.6 ? 'border-green-300 hover:border-green-500' : pct >= 0.2 ? 'border-amber-300 hover:border-amber-500' : 'border-red-300 hover:border-red-500';
                return (
                  <button
                    key={slot.id}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(slot)}
                    className={`slot-available py-3 px-2 rounded-lg text-sm font-medium border transition-all ${
                      !slot.isAvailable
                        ? 'bg-muted-bg text-muted border-card-border cursor-not-allowed'
                        : selectedSlot?.id === slot.id
                          ? 'bg-primary text-white border-primary shadow-md'
                          : `bg-card text-body ${heatBorder} hover:text-primary`
                    }`}
                  >
                    {formatTime(slot.startTime)}
                  </button>
                );
              })}
            </div>

            {/* Booking Form */}
            {selectedSlot && (
              <form onSubmit={handleBook} className="bg-card rounded-xl shadow-sm border border-card-border p-6">
                <h3 className="font-semibold text-heading mb-1">Complete Your Booking</h3>
                <p className="text-sm text-secondary mb-4">
                  Selected time: {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Parent / Guardian Name *</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="07xxx xxxxxx"
                      className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                    />
                  </div>

                  {/* Special Request */}
                  <div className="border-t border-card-border pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needsSpecial}
                        onChange={(e) => setNeedsSpecial(e.target.checked)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="text-sm text-body">I need special arrangements (e.g., telephone call)</span>
                    </label>

                    {needsSpecial && (
                      <div className="mt-3 space-y-3 pl-6">
                        <div>
                          <label className="block text-sm font-medium text-body mb-1">Type of Arrangement</label>
                          <select
                            value={requestType}
                            onChange={(e) => setRequestType(e.target.value)}
                            className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                          >
                            <option value="telephone_call">Telephone Call</option>
                            <option value="translator">Translator Needed</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        {requestType === 'telephone_call' && (
                          <div>
                            <label className="block text-sm font-medium text-body mb-1">Which number would you like to be contacted on? *</label>
                            <input
                              type="tel"
                              value={contactNumber}
                              onChange={(e) => setContactNumber(e.target.value)}
                              required={needsSpecial && requestType === 'telephone_call'}
                              placeholder="07xxx xxxxxx"
                              className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            />
                          </div>
                        )}
                        {requestType === 'translator' && (
                          <div>
                            <label className="block text-sm font-medium text-body mb-1">Which language do you require translating to? *</label>
                            <input
                              type="text"
                              value={translatorLanguage}
                              onChange={(e) => setTranslatorLanguage(e.target.value)}
                              required={needsSpecial && requestType === 'translator'}
                              placeholder="e.g. Urdu, Arabic, Bengali"
                              className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-body mb-1">Reason / Details *</label>
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            required={needsSpecial}
                            className="w-full px-3 py-2 border border-input-border bg-input-bg text-heading rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                            placeholder="Please provide details about your request..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="mt-4 text-sm text-danger">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
