import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, eventClasses, classes, students, events } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const rows = await db.select({
    bookingRef: bookings.bookingRef,
    studentId: students.studentId,
    studentName: students.name,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    parentName: bookings.parentName,
    parentPhone: bookings.parentPhone,
    parentEmail: bookings.parentEmail,
    date: eventClasses.date,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    room: eventClasses.room,
    notes: bookings.notes,
    createdAt: bookings.createdAt,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(eventClasses.eventId, parseInt(eventId)))
    .orderBy(classes.year, classes.name, timeSlots.startTime);

  const headers = ['Booking Ref', 'Student ID', 'Student Name', 'Year', 'Class', 'Teacher', 'Parent Name', 'Parent Phone', 'Parent Email', 'Date', 'Start Time', 'End Time', 'Room', 'Notes', 'Booked At'];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      r.bookingRef, r.studentId, `"${r.studentName}"`, r.year, r.className,
      `"${r.teacherName || ''}"`, `"${r.parentName}"`, r.parentPhone, r.parentEmail,
      r.date, r.startTime, r.endTime, `"${r.room || ''}"`, `"${(r.notes || '').replace(/"/g, '""')}"`, r.createdAt,
    ].join(','))
  ];

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bookings-export.csv"`,
    },
  });
}
