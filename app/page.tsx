'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProgressStepper } from './components/ProgressStepper';
import { EventBanner } from './components/EventBanner';

function HomeContent() {
  const searchParams = useSearchParams();
  const prefillName = searchParams.get('parentName') || '';
  const prefillPhone = searchParams.get('parentPhone') || '';
  const prefillEmail = searchParams.get('parentEmail') || '';

  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/students/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });

      if (res.status === 429) {
        setError('Too many attempts. Please try again in a few minutes.');
        return;
      }

      if (res.status === 404) {
        setError('Student not found or no active Visit-My-Teachers event. Please check the ID and try again.');
        return;
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        return;
      }

      const params = new URLSearchParams();
      if (prefillName) params.set('parentName', prefillName);
      if (prefillPhone) params.set('parentPhone', prefillPhone);
      if (prefillEmail) params.set('parentEmail', prefillEmail);
      const qs = params.toString();
      router.push(`/book/${encodeURIComponent(studentId.trim().toUpperCase())}${qs ? `?${qs}` : ''}`);
    } catch {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingRef.trim()) return;
    router.push(`/booking/${encodeURIComponent(bookingRef.trim().toUpperCase())}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary header-pattern text-white py-8 px-4">
        <div className="max-w-2xl mx-auto text-center animate-fade-up">
          <img src="/logo.png" alt="Madrasah Vali logo" className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/95 p-1.5 shadow-lg object-contain" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Madrasah Vali</h1>
          <p className="mt-2 text-white/70 text-sm tracking-wide font-light">Visit-My-Teachers Event</p>
        </div>
      </header>

      <EventBanner />
      <ProgressStepper currentStep={1} />

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Book Appointment Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-card-border p-8 animate-fade-up delay-1">
            <h2 className="text-xl font-semibold text-heading mb-2">Book an Appointment</h2>
            <p className="text-secondary text-sm mb-6">
              Enter your child&apos;s Student ID to view available time slots and book an appointment with their teacher.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="studentId" className="block text-sm font-medium text-body mb-1">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 632"
                className="w-full px-4 py-3 border border-input-border bg-input-bg rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-lg text-heading uppercase tracking-wider transition-colors"
                disabled={loading}
              />

              {error && (
                <p className="mt-2 text-sm text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !studentId.trim()}
                className="mt-4 w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Looking up...' : 'Find Available Slots'}
              </button>
            </form>
          </div>

          {/* Existing Booking Lookup */}
          <div className="mt-6 text-center animate-fade-up delay-2">
            <button
              onClick={() => setShowLookup(!showLookup)}
              className="text-sm text-primary hover:underline"
            >
              Already have a booking? View or cancel it
            </button>

            {showLookup && (
              <form onSubmit={handleLookup} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="Booking ref (e.g. PE-A3X9K2)"
                  className="flex-1 px-3 py-2 border border-input-border bg-input-bg rounded-xl text-sm text-heading uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!bookingRef.trim()}
                  className="px-4 py-2 bg-muted-bg text-secondary rounded-xl text-sm font-medium hover:bg-hover-bg transition-colors disabled:opacity-50"
                >
                  Look up
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted tracking-wide">
        Madrasah Vali
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
