import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendBookingReminder } from '@/lib/email';
import { formatDate, formatTime } from '@/lib/utils';
import { headers } from 'next/headers';

export async function GET() {
  // Verify cron secret
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find bookings where the event class date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const tomorrowBookings = await db.select({
    bookingId: bookings.id,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
    parentEmail: bookings.parentEmail,
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
    .where(and(
      eq(eventClasses.date, tomorrowStr),
      eq(events.isActive, true),
      eq(bookings.reminderSent, false),
    ));

  if (!tomorrowBookings.length) {
    return NextResponse.json({ message: 'No bookings for tomorrow', sent: 0 });
  }

  let sent = 0;
  let errors = 0;

  for (const booking of tomorrowBookings) {
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

      // Small delay to avoid Gmail throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Failed to send reminder to ${booking.parentEmail}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, errors });
}
