'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import { formatTime } from '@/lib/utils';

interface CheckinBooking {
  id: number;
  bookingRef: string;
  parentName: string;
  parentPhone: string;
  checkedInAt: string | null;
  startTime: string;
  endTime: string;
  studentName: string;
  studentId: string;
  className: string;
  year: string;
}

type Filter = 'all' | 'checked-in' | 'not-yet';

export default function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [allBookings, setAllBookings] = useState<CheckinBooking[]>([]);
  const [searchResults, setSearchResults] = useState<CheckinBooking[] | null>(null);
  const [total, setTotal] = useState(0);
  const [checkedIn, setCheckedIn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/checkin?eventId=${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setAllBookings(data.bookings);
      setTotal(data.total);
      setCheckedIn(data.checkedIn);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 15000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCheckIn(bookingId: number, bookingRef?: string) {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingRef ? { bookingRef } : { bookingId }),
    });

    if (res.ok) {
      const data = await res.json();
      setToast({ message: `${data.studentName} checked in`, type: 'success' });
      loadBookings();
      if (searchResults) handleSearch(searchQuery);
    } else {
      const data = await res.json();
      setToast({ message: data.error || 'Check-in failed', type: 'error' });
    }
  }

  async function handleUndoCheckIn(bookingId: number) {
    await fetch('/api/checkin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    loadBookings();
    if (searchResults) handleSearch(searchQuery);
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const res = await fetch(`/api/checkin/search?eventId=${eventId}&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setSearchResults(await res.json());
    }
  }

  function onSearchChange(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => handleSearch(value), 300);
  }

  async function toggleScanner() {
    if (scanning) {
      // Stop scanner
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
    // Dynamically import html5-qrcode
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // Extract booking ref from QR code
          const ref = decodedText.trim().toUpperCase();
          handleCheckIn(0, ref);
          scanner.stop().catch(() => {});
          html5QrRef.current = null;
          setScanning(false);
        },
        () => { /* ignore scan errors */ }
      );
    } catch (err) {
      setToast({ message: 'Camera access denied or unavailable', type: 'error' });
      setScanning(false);
    }
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        (html5QrRef.current as { stop: () => Promise<void> }).stop().catch(() => {});
      }
    };
  }, []);

  const displayedBookings = searchResults ?? allBookings;
  const filtered = filter === 'all'
    ? displayedBookings
    : filter === 'checked-in'
      ? displayedBookings.filter(b => b.checkedInAt)
      : displayedBookings.filter(b => !b.checkedInAt);

  if (loading) {
    return <div className="animate-pulse p-6">Loading check-in data...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link href={`/admin/events/${eventId}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Event</Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Check-In</h1>
          </div>
          <Link
            href={`/checkin/${eventId}`}
            target="_blank"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors self-start sm:self-auto"
          >
            Open Kiosk Mode
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent">{checkedIn}</p>
            <p className="text-xs text-gray-500">of {total} checked in</p>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-amber-600">{total - checkedIn}</p>
            <p className="text-xs text-gray-500">remaining</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${total > 0 ? (checkedIn / total) * 100 : 0}%` }}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Search + Scanner */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, student ID, or booking ref..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <button
          onClick={toggleScanner}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            scanning
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-primary text-white hover:bg-primary-light'
          }`}
        >
          {scanning ? 'Stop Scanner' : 'Scan QR'}
        </button>
      </div>

      {/* QR Scanner */}
      {scanning && (
        <div className="mb-4 bg-black rounded-xl overflow-hidden">
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {([['all', 'All'], ['checked-in', 'Checked In'], ['not-yet', 'Not Yet']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className="ml-1 text-xs text-gray-400">
              ({key === 'all' ? displayedBookings.length : key === 'checked-in' ? displayedBookings.filter(b => b.checkedInAt).length : displayedBookings.filter(b => !b.checkedInAt).length})
            </span>
          </button>
        ))}
      </div>

      {/* Attendee list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No bookings found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(b => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    b.checkedInAt ? 'bg-accent/15 text-accent' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {b.checkedInAt ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      b.studentName.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.studentName}</p>
                    <p className="text-xs text-gray-500">{b.year} - {b.className} &middot; {formatTime(b.startTime)} &middot; {b.parentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">{b.bookingRef}</span>
                  {b.checkedInAt ? (
                    <button
                      onClick={() => handleUndoCheckIn(b.id)}
                      className="px-3 py-1 text-xs border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(b.id)}
                      className="px-3 py-1 text-xs bg-accent text-white rounded-lg font-medium hover:bg-accent-light transition-colors"
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
