'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProgressStepper } from './components/ProgressStepper';
import { EventBanner } from './components/EventBanner';

function HomeContent() {
  const searchParams = useSearchParams();
  const prefillName = searchParams.get('parentName') || '';
  const prefillPhone = searchParams.get('parentPhone') || '';
  const prefillEmail = searchParams.get('parentEmail') || '';
  const wasCancelled = searchParams.get('cancelled') === 'true';

  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState<{ name: string; className: string; year: string } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => void } | null>(null);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setShowIOSTip(true);
      return;
    }

    // Android: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as { prompt: () => void });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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

      const data = await res.json();
      setConfirmStudent({
        name: data.student.name,
        className: data.student.className,
        year: data.student.year,
      });
    } catch {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmStudent() {
    const params = new URLSearchParams();
    if (prefillName) params.set('parentName', prefillName);
    if (prefillPhone) params.set('parentPhone', prefillPhone);
    if (prefillEmail) params.set('parentEmail', prefillEmail);
    const qs = params.toString();
    router.push(`/book/${encodeURIComponent(studentId.trim().toUpperCase())}${qs ? `?${qs}` : ''}`);
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
          {wasCancelled && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center animate-fade-up">
              <p className="text-sm text-green-700 font-medium">Your booking has been cancelled. The time slot has been released.</p>
              <p className="text-xs text-green-600 mt-1">A confirmation email has been sent.</p>
            </div>
          )}
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

      {/* Confirm Student Modal */}
      {confirmStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmStudent(null)}>
          <div className="bg-card rounded-2xl shadow-lg border border-card-border p-6 w-full max-w-sm animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-heading text-center mb-1">Is this your child?</h3>
            <p className="text-secondary text-sm text-center mb-5">Please confirm the details below are correct.</p>

            <div className="bg-muted-bg rounded-xl p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Name:</span>
                <span className="font-semibold text-heading">{confirmStudent.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Year:</span>
                <span className="font-semibold text-heading">{confirmStudent.year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Class:</span>
                <span className="font-semibold text-heading">{confirmStudent.className}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmStudent(null); setStudentId(''); }}
                className="flex-1 py-3 bg-muted-bg text-body rounded-xl font-medium hover:bg-hover-bg transition-colors"
              >
                No, go back
              </button>
              <button
                onClick={handleConfirmStudent}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-light transition-colors"
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install App Banner */}
      {installPrompt && !installDismissed && (
        <div className="mx-4 mb-2 bg-card border border-card-border rounded-xl px-4 py-3 flex items-center gap-3 max-w-md self-center shadow-sm">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-heading">Visit-My-Teachers</p>
            <p className="text-xs text-secondary">Install the app for quick access</p>
          </div>
          <button
            onClick={() => { installPrompt.prompt(); setInstallDismissed(true); }}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-light transition-colors shrink-0"
          >
            Install
          </button>
          <button onClick={() => setInstallDismissed(true)} className="text-muted hover:text-secondary shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* iOS Install Tip */}
      {showIOSTip && (
        <div className="mx-4 mb-2 bg-card border border-card-border rounded-xl px-4 py-3 flex items-start gap-3 max-w-md self-center shadow-sm">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-heading">Install Visit-My-Teachers</p>
            <p className="text-xs text-secondary leading-relaxed mt-0.5">
              Tap <svg className="w-3.5 h-3.5 inline-block align-text-bottom text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> then &quot;Add to Home Screen&quot;
            </p>
          </div>
          <button onClick={() => setShowIOSTip(false)} className="text-muted hover:text-secondary shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-xs text-muted tracking-wide space-y-1">
        <p className="font-medium text-secondary">Madrasah Vali at Issa Hikmah Centre</p>
        <p>For support, please email us at <a href="mailto:info@madrasahvali.com" className="text-primary hover:underline">info@madrasahvali.com</a></p>
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
