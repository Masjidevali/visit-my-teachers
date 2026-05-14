import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendBookingReminder } from '@/lib/email';
import { isAuthenticated } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { formatDate, formatTime } from '@/lib/utils';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, bookingIds, force } = await request.json() as {
    eventId: number | string;
    bookingIds?: number[];
    force?: boolean;
  };

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const parsedEventId = Number(eventId);

  const whereClauses = [eq(eventClasses.eventId, parsedEventId)];
  if (bookingIds && bookingIds.length > 0) {
    whereClauses.push(inArray(bookings.id, bookingIds));
  }

  const candidates = await db.select({
    bookingId: bookings.id,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
    parentEmail: bookings.parentEmail,
    reminderSent: bookings.reminderSent,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    studentName: students.name,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    classDate: eventClasses.date,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(and(...whereClauses));

  let sent = 0;
  let skippedAlreadySent = 0;
  let errors = 0;

  for (const booking of candidates) {
    if (!force && booking.reminderSent) {
      skippedAlreadySent++;
      continue;
    }

    try {
      await sendBookingReminder({
        parentName: booking.parentName,
        parentEmail: booking.parentEmail,
        studentName: booking.studentName,
        className: `${booking.year} - ${booking.className}`,
        teacherName: booking.showTeacher ? (booking.teacherName || '') : '',
        date: formatDate(booking.classDate),
        time: `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`,
        bookingRef: booking.bookingRef,
        room: booking.room || undefined,
      });

      await db.update(bookings)
        .set({ reminderSent: true })
        .where(eq(bookings.id, booking.bookingId));

      sent++;

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Failed to send reminder to ${booking.parentEmail}:`, err);
      errors++;
    }
  }

  await logActivity(
    'Send booked reminders',
    `${sent} sent, ${skippedAlreadySent} skipped for event #${parsedEventId}${force ? ' (force)' : ''}`,
  );

  return NextResponse.json({ sent, skippedAlreadySent, errors });
}
