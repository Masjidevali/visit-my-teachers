'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatTime, formatDate } from '@/lib/utils';
import { generateICS, generateGoogleCalendarUrl } from '@/lib/calendar';
import { ProgressStepper } from '@/app/components/ProgressStepper';

interface BookingDetails {
  bookingRef: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  startTime: string;
  endTime: string;
  studentName: string;
  className: string;
  teacherName: string;
  room: string;
  eventDate: string;
  eventName: string;
}

function ConfirmContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    async function load() {
      const res = await fetch(`/api/bookings/${ref}`);
      if (res.ok) {
        setBooking(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [ref]);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!booking) return;
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(booking.bookingRef, { width: 160, margin: 1 }).then(setQrDataUrl);
    });
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7BC800', '#007BCB', '#C91212'],
      });
    });
  }, [booking]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return <p className="text-center text-secondary py-20">Booking not found.</p>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-card rounded-xl shadow-sm border border-card-border p-8 text-center">
        <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-heading mb-2">Booking Confirmed!</h1>
        <p className="text-secondary text-sm mb-6">A confirmation email has been sent.</p>

        <div className="bg-muted-bg rounded-lg p-4 mb-6 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Student:</span>
              <span className="font-medium text-heading">{booking.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Class:</span>
              <span className="font-medium text-heading">{booking.className}</span>
            </div>
            {booking.teacherName && (
              <div className="flex justify-between">
                <span className="text-secondary">Teacher:</span>
                <span className="font-medium text-heading">{booking.teacherName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary">Date:</span>
              <span className="font-medium text-heading">{formatDate(booking.eventDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Time:</span>
              <span className="font-medium text-heading">{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
            </div>
            {booking.room && (
              <div className="flex justify-between">
                <span className="text-secondary">Room:</span>
                <span className="font-medium text-heading">{booking.room}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-xs text-muted mb-1">Your Booking Reference</p>
          <p className="text-2xl font-mono font-bold text-primary tracking-wider">{booking.bookingRef}</p>
          <p className="text-xs text-muted mt-1">Keep this safe to view or cancel your booking.</p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code for check-in" className="mx-auto mt-3 w-28 h-28 rounded" />
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              const ics = generateICS({
                studentName: booking.studentName,
                className: booking.className,
                teacherName: booking.teacherName,
                bookingRef: booking.bookingRef,
                eventDate: booking.eventDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                room: booking.room || undefined,
              });
              const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `visit-my-teachers-${booking.bookingRef}.ics`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-card-border rounded-lg text-sm text-body hover:bg-muted-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Download .ics
          </button>
          <a
            href={generateGoogleCalendarUrl({
              studentName: booking.studentName,
              className: booking.className,
              teacherName: booking.teacherName,
              bookingRef: booking.bookingRef,
              eventDate: booking.eventDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
              room: booking.room || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-card-border rounded-lg text-sm text-body hover:bg-muted-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Google Calendar
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/?parentName=${encodeURIComponent(booking.parentName)}&parentPhone=${encodeURIComponent(booking.parentPhone)}&parentEmail=${encodeURIComponent(booking.parentEmail)}`}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-light transition-colors text-center"
          >
            Book Another Child
          </Link>
          <Link
            href={`/booking/${booking.bookingRef}`}
            className="w-full bg-muted-bg text-body py-3 px-4 rounded-lg font-medium hover:bg-hover-bg transition-colors text-center"
          >
            View Booking Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary header-pattern text-white py-6 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
          <img src="/logo.png" alt="" className="w-12 h-12 rounded-full bg-white/95 p-1 shadow object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">Madrasah Vali</h1>
        </div>
      </header>
      <ProgressStepper currentStep={3} />
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <ConfirmContent />
        </Suspense>
      </main>
    </div>
  );
}
