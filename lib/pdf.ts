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
  const head = ['Time', 'Student', 'Parent'];
  if (hasPhoneCalls) head.push('Phone Number');
  if (hasTranslators) head.push('Language');
  head.push('Notes');

  // Build table rows
  const body = slots.map(slot => {
    const row = [
      `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      slot.studentName || '(Available)',
      slot.parentName || '-',
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

function addCoverPage(doc: jsPDF, room: string, schedulesInRoom: ScheduleData[], isFirst: boolean) {
  if (!isFirst) doc.addPage();

  const eventName = schedulesInRoom[0]?.class.eventName || '';
  const eventDate = schedulesInRoom[0]?.class.eventDate || '';

  // Brand header — same coordinates as addSchedulePage
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Madrasah Vali - Visit-My-Teachers', 14, 18);

  doc.setFontSize(12);
  doc.text(eventName, 14, 26);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (eventDate) {
    doc.text(`Date: ${formatDate(eventDate)}`, 14, 33);
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 36, 196, 36);

  // Room title — centred
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(room, 105, 80, { align: 'center' });

  // Class count subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`${schedulesInRoom.length} class${schedulesInRoom.length !== 1 ? 'es' : ''}`, 105, 92, { align: 'center' });
  doc.setTextColor(0);

  // Class list
  doc.setFontSize(11);
  let y = 110;
  const pageBottom = 280;
  for (const s of schedulesInRoom) {
    if (y > pageBottom) break;
    const left = `${s.class.year} - ${s.class.name}`;
    const right = s.class.teacherName || '';
    doc.setFont('helvetica', 'bold');
    doc.text(left, 14, y);
    doc.setFont('helvetica', 'normal');
    if (right) doc.text(right, 196, y, { align: 'right' });
    y += 8;
  }
}

export function generateSchedulePDF(data: ScheduleData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addSchedulePage(doc, data, true);
  return doc.output('blob');
}

export function generateAllSchedulesPDF(schedules: ScheduleData[]): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const groups = new Map<string, ScheduleData[]>();
  for (const s of schedules) {
    const room = (s.class.room || '').trim() || 'Unassigned';
    const arr = groups.get(room) ?? [];
    arr.push(s);
    groups.set(room, arr);
  }

  const realRooms = Array.from(groups.keys())
    .filter(r => r !== 'Unassigned')
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const ordered = groups.has('Unassigned') ? [...realRooms, 'Unassigned'] : realRooms;

  ordered.forEach((room, roomIdx) => {
    const inRoom = (groups.get(room) ?? []).slice().sort((a, b) =>
      a.class.year.localeCompare(b.class.year, undefined, { numeric: true }) ||
      a.class.name.localeCompare(b.class.name),
    );
    addCoverPage(doc, room, inRoom, roomIdx === 0);
    for (const data of inRoom) {
      addSchedulePage(doc, data, false);
    }
  });

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
