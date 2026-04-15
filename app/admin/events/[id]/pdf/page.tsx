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
}

interface ClassInfo {
  name: string;
  teacherName: string;
  room: string;
  eventName: string;
  eventDate: string;
}

function PDFContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const eventClassId = searchParams.get('eventClassId');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventClassId) return;
    fetch(`/api/export/teacher-schedule?eventClassId=${eventClassId}`)
      .then(r => r.json())
      .then(data => {
        setClassInfo(data.class);
        setSlots(data.slots);
        setLoading(false);
      });
  }, [eventClassId]);

  useEffect(() => {
    if (!loading && classInfo) {
      // Auto-trigger print dialog
      setTimeout(() => window.print(), 500);
    }
  }, [loading, classInfo]);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!classInfo) return <p className="p-8">Class not found.</p>;

  return (
    <div className="p-8 max-w-4xl mx-auto print:p-4 print:max-w-none">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <button onClick={() => window.print()} className="no-print mb-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">
        Print / Save as PDF
      </button>

      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold">Madrasah Vali - Visit-My-Teachers</h1>
        <h2 className="text-lg font-semibold mt-1">{classInfo.eventName}</h2>
        <div className="flex gap-8 mt-2 text-sm text-gray-600">
          <p><strong>Date:</strong> {new Date(classInfo.eventDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p><strong>Class:</strong> {classInfo.name}</p>
          <p><strong>Teacher:</strong> {classInfo.teacherName}</p>
          {classInfo.room && <p><strong>Room:</strong> {classInfo.room}</p>}
        </div>
      </div>

      {/* Schedule Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left w-28">Time</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Student</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Parent</th>
            <th className="border border-gray-300 px-3 py-2 text-left w-32">Phone</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={i} className={slot.studentName ? '' : 'text-gray-400'}>
              <td className="border border-gray-300 px-3 py-2 font-medium">
                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
              </td>
              <td className="border border-gray-300 px-3 py-2">
                {slot.studentName || '(Available)'}
              </td>
              <td className="border border-gray-300 px-3 py-2">
                {slot.parentName || '-'}
              </td>
              <td className="border border-gray-300 px-3 py-2">
                {slot.parentPhone || '-'}
              </td>
              <td className="border border-gray-300 px-3 py-2">
                {slot.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-xs text-gray-400 print:mt-4">
        Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}
      </p>
    </div>
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
