interface CalendarDetails {
  studentName: string;
  className: string;
  teacherName: string;
  bookingRef: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  room?: string;
}

function toICSDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [h, min] = time.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

export function generateICS(details: CalendarDetails): string {
  const dtStart = toICSDateTime(details.eventDate, details.startTime);
  const dtEnd = toICSDateTime(details.eventDate, details.endTime);

  const description = [
    `Class: ${details.className}`,
    details.teacherName ? `Teacher: ${details.teacherName}` : '',
    `Booking Ref: ${details.bookingRef}`,
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Madrasah Vali//Visit-My-Teachers//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Visit-My-Teachers - ${details.studentName}`,
    `DESCRIPTION:${description}`,
    details.room ? `LOCATION:${details.room}` : '',
    `UID:${details.bookingRef}@madrasahvali`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function generateGoogleCalendarUrl(details: CalendarDetails): string {
  const dtStart = toICSDateTime(details.eventDate, details.startTime);
  const dtEnd = toICSDateTime(details.eventDate, details.endTime);

  const description = [
    `Class: ${details.className}`,
    details.teacherName ? `Teacher: ${details.teacherName}` : '',
    `Booking Ref: ${details.bookingRef}`,
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Visit-My-Teachers - ${details.studentName}`,
    dates: `${dtStart}/${dtEnd}`,
    details: description,
  });

  if (details.room) {
    params.set('location', details.room);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
