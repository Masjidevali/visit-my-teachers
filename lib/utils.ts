import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function generateBookingRef(): string {
  return `PE-${nanoid()}`;
}

export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
    const slotEndMin = currentMinutes + durationMinutes;
    const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;
    slots.push({ start: slotStart, end: slotEnd });
    currentMinutes = slotEndMin;
  }

  return slots;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function isValidUKPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(07\d{9}|(\+44)7\d{9})$/.test(cleaned);
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  telephone_call: 'Telephone Call',
  translator: 'Translator Needed',
  other: 'Other',
};

export function formatRequestType(type: string): string {
  return REQUEST_TYPE_LABELS[type] || type;
}
