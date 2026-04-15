import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTime } from './utils';

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
  contactNumber: string | null;
}

interface ScheduleData {
  class: ClassInfo;
  slots: SlotData[];
  specialRequests: SpecialRequestData[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function addSchedulePage(doc: jsPDF, data: ScheduleData, isFirst: boolean) {
  if (!isFirst) doc.addPage();

  const cls = data.class;
  const slots = data.slots;
  const requests = data.specialRequests || [];

  const phoneCallRequests = new Map(
    requests.filter(r => r.requestType === 'telephone_call' && r.contactNumber).map(r => [r.studentId, r.contactNumber])
  );
  const translatorRequests = new Map(
    requests.filter(r => r.requestType === 'translator' && r.contactNumber).map(r => [r.studentId, r.contactNumber])
  );
  const hasPhoneCalls = phoneCallRequests.size > 0;
  const hasTranslators = translatorRequests.size > 0;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Madrasah Vali - Visit-My-Teachers', 14, 18);

  doc.setFontSize(12);
  doc.text(cls.eventName, 14, 26);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const info = [`Date: ${formatDate(cls.eventDate)}`, `Class: ${cls.year} - ${cls.name}`, `Teacher: ${cls.teacherName}`];
  if (cls.room) info.push(`Room: ${cls.room}`);
  doc.text(info.join('    |    '), 14, 33);

  // Line under header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 36, 196, 36);

  // Build table columns
  const head = ['Time', 'Student', 'Parent', 'Phone'];
  if (hasPhoneCalls) head.push('Call Number');
  if (hasTranslators) head.push('Language');
  head.push('Notes');

  // Build table rows
  const body = slots.map(slot => {
    const row = [
      `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      slot.studentName || '(Available)',
      slot.parentName || '-',
      slot.parentPhone || '-',
    ];
    if (hasPhoneCalls) row.push(slot.studentDbId ? (phoneCallRequests.get(slot.studentDbId) || '-') : '-');
    if (hasTranslators) row.push(slot.studentDbId ? (translatorRequests.get(slot.studentDbId) || '-') : '-');
    row.push(slot.notes || '-');
    return row;
  });

  autoTable(doc, {
    startY: 40,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 247] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(7);
  doc.setTextColor(160);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 14, finalY + 8);
  doc.setTextColor(0);
}

export function generateSchedulePDF(data: ScheduleData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addSchedulePage(doc, data, true);
  return doc.output('blob');
}

export function generateAllSchedulesPDF(schedules: ScheduleData[]): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  schedules.forEach((data, i) => addSchedulePage(doc, data, i === 0));
  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
