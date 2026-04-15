'use client';

import { useState, useEffect, useRef, use } from 'react';
import { formatTime } from '@/lib/utils';

type Screen = 'pin' | 'idle' | 'loading' | 'success' | 'already' | 'error';

interface CheckinResult {
  studentName: string;
  className: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function KioskPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const html5QrRef = useRef<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pinRef = useRef<HTMLInputElement>(null);

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError('');
    const res = await fetch('/api/checkin/kiosk/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      setScreen('idle');
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setPin('');
      pinRef.current?.focus();
    }
  }

  // Auto-focus input on idle
  useEffect(() => {
    if (screen === 'pin' && pinRef.current) {
      pinRef.current.focus();
    }
    if (screen === 'idle' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen]);

  // Auto-reset to idle after showing result
  useEffect(() => {
    if (screen === 'success' || screen === 'already' || screen === 'error') {
      resetTimer.current = setTimeout(() => {
        setScreen('idle');
        setStudentId('');
        setResult(null);
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(resetTimer.current);
    }
  }, [screen]);

  async function handleCheckIn(value?: string) {
    const input = (value || studentId).trim();
    if (!input) return;

    setScreen('loading');

    try {
      // Determine if it's a booking ref (starts with PE-) or student ID
      const isRef = input.toUpperCase().startsWith('PE-');
      const body = isRef
        ? { eventId: parseInt(eventId), bookingRef: input }
        : { eventId: parseInt(eventId), studentId: input };

      const res = await fetch('/api/checkin/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.status === 404) {
        setErrorMsg(data.error || 'No booking found.');
        setScreen('error');
        return;
      }

      if (data.alreadyCheckedIn) {
        setResult(data);
        setScreen('already');
        return;
      }

      if (data.success) {
        setResult(data);
        setScreen('success');
        return;
      }

      setErrorMsg('Something went wrong. Please try again.');
      setScreen('error');
    } catch {
      setErrorMsg('Unable to connect. Please try again.');
      setScreen('error');
    }
  }

  async function toggleScanner() {
    if (scanning) {
      if (html5QrRef.current) {
        try {
          await (html5QrRef.current as { stop: () => Promise<void> }).stop();
        } catch { /* ignore */ }
      }
      html5QrRef.current = null;
      setScanning(false);
      return;
    }

    setScanning(true);
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('kiosk-qr-reader');
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scanner.stop().catch(() => {});
          html5QrRef.current = null;
          setScanning(false);
          handleCheckIn(decodedText.trim());
        },
        () => {}
      );
    } catch {
      setScanning(false);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        (html5QrRef.current as { stop: () => Promise<void> }).stop().catch(() => {});
      }
    };
  }, []);

  function handleTapToReset() {
    clearTimeout(resetTimer.current);
    setScreen('idle');
    setStudentId('');
    setResult(null);
    setErrorMsg('');
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-5 px-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <img src="/logo.png" alt="" className="w-10 h-10 rounded-full bg-white/95 p-1 object-contain" />
          <div>
            <h1 className="text-xl font-bold tracking-tight font-display">Madrasah Vali</h1>
            <p className="text-xs text-white/60">Visit-My-Teachers Check-In</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">

        {/* PIN — Lock screen */}
        {screen === 'pin' && (
          <div className="w-full max-w-xs text-center animate-fade-up">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-heading mb-2 font-display">Kiosk Locked</h2>
            <p className="text-secondary text-sm mb-6">Enter the PIN to activate check-in.</p>
            <form onSubmit={handlePinSubmit}>
              <input
                ref={pinRef}
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full px-6 py-4 border-2 border-card-border bg-card rounded-2xl text-center text-2xl font-bold text-heading tracking-widest focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                autoComplete="off"
              />
              {pinError && <p className="mt-2 text-sm text-danger">{pinError}</p>}
              <button
                type="submit"
                disabled={!pin.trim()}
                className="mt-4 w-full bg-primary text-white py-4 rounded-2xl text-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-40"
              >
                Unlock
              </button>
            </form>
          </div>
        )}

        {/* IDLE — Input screen */}
        {screen === 'idle' && (
          <div className="w-full max-w-md text-center animate-fade-up">
            <h2 className="text-2xl font-bold text-heading mb-2 font-display">Welcome</h2>
            <p className="text-secondary mb-8">Enter your child's Student ID or scan your QR code to check in.</p>

            <form onSubmit={(e) => { e.preventDefault(); handleCheckIn(); }} className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Student ID (e.g. 632)"
                className="w-full px-6 py-4 border-2 border-card-border bg-card rounded-2xl text-center text-2xl font-bold text-heading uppercase tracking-widest focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={!studentId.trim()}
                className="w-full bg-primary text-white py-4 rounded-2xl text-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Check In
              </button>
            </form>

            <div className="mt-6">
              <button
                onClick={toggleScanner}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  scanning
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-card border border-card-border text-body hover:bg-hover-bg'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {scanning ? 'Stop Scanner' : 'Scan QR Code'}
              </button>
            </div>

            {scanning && (
              <div className="mt-4 rounded-2xl overflow-hidden border-2 border-card-border">
                <div id="kiosk-qr-reader" style={{ width: '100%' }} />
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {screen === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary">Checking in...</p>
          </div>
        )}

        {/* SUCCESS */}
        {screen === 'success' && result && (
          <div className="w-full max-w-md text-center animate-fade-up" onClick={handleTapToReset}>
            <div className="w-24 h-24 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <svg className="w-14 h-14 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-accent mb-2 font-display">Checked In!</h2>
            <p className="text-2xl font-semibold text-heading mb-1">{result.studentName}</p>
            <p className="text-secondary mb-6">{result.className}</p>

            <div className="bg-card rounded-2xl border border-card-border p-5 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary text-sm">Time</span>
                <span className="font-semibold text-heading">{formatTime(result.startTime)} - {formatTime(result.endTime)}</span>
              </div>
              {result.room && (
                <div className="flex justify-between">
                  <span className="text-secondary text-sm">Room</span>
                  <span className="font-semibold text-heading">{result.room}</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-muted">Tap anywhere to return</p>
          </div>
        )}

        {/* ALREADY CHECKED IN */}
        {screen === 'already' && result && (
          <div className="w-full max-w-md text-center animate-fade-up" onClick={handleTapToReset}>
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-14 h-14 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-primary mb-2 font-display">Already Checked In</h2>
            <p className="text-2xl font-semibold text-heading mb-1">{result.studentName}</p>
            <p className="text-secondary mb-6">{result.className}</p>

            <div className="bg-card rounded-2xl border border-card-border p-5 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary text-sm">Time</span>
                <span className="font-semibold text-heading">{formatTime(result.startTime)} - {formatTime(result.endTime)}</span>
              </div>
              {result.room && (
                <div className="flex justify-between">
                  <span className="text-secondary text-sm">Room</span>
                  <span className="font-semibold text-heading">{result.room}</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-muted">Tap anywhere to return</p>
          </div>
        )}

        {/* ERROR */}
        {screen === 'error' && (
          <div className="w-full max-w-md text-center animate-fade-up" onClick={handleTapToReset}>
            <div className="w-24 h-24 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-14 h-14 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-danger mb-3 font-display">Not Found</h2>
            <p className="text-secondary text-lg">{errorMsg}</p>
            <p className="mt-6 text-xs text-muted">Tap anywhere to try again</p>
          </div>
        )}

      </main>
    </div>
  );
}
