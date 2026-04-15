'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatTime } from '@/lib/utils';

interface SlotData {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  parentName: string | null;
  parentPhone: string | null;
  notes: string | null;
  studentName: string | null;
  studentIdStr: string | null;
  studentDbId: number | null;
}

interface ClassInfo {
  name: string;
  year: string;
  teacherName: string;
  room: string;
  eventName: string;
  eventDate: string;
}

interface SpecialRequestData {
  studentId: number;
  requestType: string;
  reason: string;
  contactNumber: string | null;
  status: string;
}

function PDFContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const eventClassId = searchParams.get('eventClassId');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [requests, setRequests] = useState<SpecialRequestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventClassId) return;
    fetch(`/api/export/teacher-schedule?eventClassId=${eventClassId}`)
      .then(r => r.json())
      .then(data => {
        setClassInfo(data.class);
        setSlots(data.slots);
        setRequests(data.specialRequests || []);
        setLoading(false);
      });
  }, [eventClassId]);

  useEffect(() => {
    if (!loading && classInfo) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, classInfo]);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!classInfo) return <p className="p-8">Class not found.</p>;

  const phoneCallRequests = new Map(
    requests
      .filter(r => r.requestType === 'telephone_call' && r.contactNumber)
      .map(r => [r.studentId, r.contactNumber])
  );
  const translatorRequests = new Map(
    requests
      .filter(r => r.requestType === 'translator' && r.contactNumber)
      .map(r => [r.studentId, r.contactNumber])
  );
  const hasPhoneCalls = phoneCallRequests.size > 0;
  const hasTranslators = translatorRequests.size > 0;

  return (
    <>
      <style>{`
        @media print {
          /* Hide everything from the admin layout */
          body > div > div > .brand-stripe,
          body > div > div > .logo-watermark,
          body aside,
          body .lg\\:hidden,
          .no-print,
          .surface-pattern::before {
            display: none !important;
          }

          /* Reset all layout wrappers */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            min-height: auto !important;
            height: auto !important;
          }

          body > div,
          body > div > div,
          body > div > div > div,
          main {
            display: block !important;
            min-height: auto !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          /* Print colour support */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Prevent blank trailing pages */
          @page {
            margin: 10mm 8mm;
            size: A4 portrait;
          }

          .pdf-content {
            padding: 0 !important;
            max-width: none !important;
          }

          /* Prevent rows breaking across pages */
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="pdf-content p-8 max-w-4xl mx-auto">
        <button onClick={() => window.print()} className="no-print mb-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">
          Print / Save as PDF
        </button>

        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Madrasah Vali - Visit-My-Teachers</h1>
          <h2 className="text-lg font-semibold mt-1">{classInfo.eventName}</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-1 mt-2 text-sm text-gray-600">
            <p><strong>Date:</strong> {new Date(classInfo.eventDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Class:</strong> {classInfo.year} - {classInfo.name}</p>
            <p><strong>Teacher:</strong> {classInfo.teacherName}</p>
            {classInfo.room && <p><strong>Room:</strong> {classInfo.room}</p>}
          </div>
        </div>

        {/* Schedule Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1.5 text-left">Time</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">Student</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">Parent</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">Phone</th>
              {hasPhoneCalls && <th className="border border-gray-300 px-2 py-1.5 text-left">Call Number</th>}
              {hasTranslators && <th className="border border-gray-300 px-2 py-1.5 text-left">Language</th>}
              <th className="border border-gray-300 px-2 py-1.5 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => {
              const callNumber = slot.studentDbId ? phoneCallRequests.get(slot.studentDbId) : null;
              const language = slot.studentDbId ? translatorRequests.get(slot.studentDbId) : null;
              return (
                <tr key={i} className={slot.studentName ? '' : 'text-gray-400'}>
                  <td className="border border-gray-300 px-2 py-1.5 font-medium whitespace-nowrap">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {slot.studentName || '(Available)'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {slot.parentName || '-'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {slot.parentPhone || '-'}
                  </td>
                  {hasPhoneCalls && (
                    <td className="border border-gray-300 px-2 py-1.5 font-medium">
                      {callNumber || '-'}
                    </td>
                  )}
                  {hasTranslators && (
                    <td className="border border-gray-300 px-2 py-1.5 font-medium">
                      {language || '-'}
                    </td>
                  )}
                  <td className="border border-gray-300 px-2 py-1.5">
                    {slot.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-4 text-xs text-gray-400">
          Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}
        </p>
      </div>
    </>
  );
}

export default function PDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p className="p-8">Loading...</p>}>
      <PDFContent eventId={id} />
    </Suspense>
  );
}
