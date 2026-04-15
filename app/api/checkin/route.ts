import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, eventClasses, classes, students } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const allBookings = await db.select({
    id: bookings.id,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
    parentPhone: bookings.parentPhone,
    checkedInAt: bookings.checkedInAt,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    studentName: students.name,
    studentId: students.studentId,
    className: classes.name,
    year: classes.year,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(eventClasses.eventId, parseInt(eventId)))
    .orderBy(classes.year, classes.name, timeSlots.startTime);

  const total = allBookings.length;
  const checkedIn = allBookings.filter(b => b.checkedInAt).length;

  return NextResponse.json({ bookings: allBookings, total, checkedIn });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingRef, bookingId } = await request.json();

  let booking;
  if (bookingRef) {
    booking = await db.select({ id: bookings.id, studentName: students.name })
      .from(bookings)
      .innerJoin(students, eq(bookings.studentId, students.id))
      .where(eq(bookings.bookingRef, bookingRef.toUpperCase()))
      .get();
  } else if (bookingId) {
    booking = await db.select({ id: bookings.id, studentName: students.name })
      .from(bookings)
      .innerJoin(students, eq(bookings.studentId, students.id))
      .where(eq(bookings.id, bookingId))
      .get();
  }

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  await db.update(bookings)
    .set({ checkedInAt: sql`datetime('now')` })
    .where(eq(bookings.id, booking.id));

  return NextResponse.json({ success: true, studentName: booking.studentName });
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingId } = await request.json();

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
  }

  await db.update(bookings)
    .set({ checkedInAt: null })
    .where(eq(bookings.id, bookingId));

  return NextResponse.json({ success: true });
}
