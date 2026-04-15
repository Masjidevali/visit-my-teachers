import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, eventClasses, classes, students, events } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  const { eventId, studentId, bookingRef } = await request.json();

  if (!eventId || (!studentId && !bookingRef)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Find the booking
  let booking;

  if (bookingRef) {
    booking = await db.select({
      id: bookings.id,
      bookingRef: bookings.bookingRef,
      checkedInAt: bookings.checkedInAt,
      startTime: timeSlots.startTime,
      endTime: timeSlots.endTime,
      studentName: students.name,
      className: classes.name,
      year: classes.year,
      room: eventClasses.room,
    })
      .from(bookings)
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
      .innerJoin(classes, eq(eventClasses.classId, classes.id))
      .innerJoin(students, eq(bookings.studentId, students.id))
      .where(and(
        eq(bookings.bookingRef, bookingRef.trim().toUpperCase()),
        eq(eventClasses.eventId, eventId),
      ))
      .get();
  } else {
    booking = await db.select({
      id: bookings.id,
      bookingRef: bookings.bookingRef,
      checkedInAt: bookings.checkedInAt,
      startTime: timeSlots.startTime,
      endTime: timeSlots.endTime,
      studentName: students.name,
      className: classes.name,
      year: classes.year,
      room: eventClasses.room,
    })
      .from(bookings)
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
      .innerJoin(classes, eq(eventClasses.classId, classes.id))
      .innerJoin(students, eq(bookings.studentId, students.id))
      .where(and(
        eq(students.studentId, studentId.trim().toUpperCase()),
        eq(eventClasses.eventId, eventId),
      ))
      .get();
  }

  if (!booking) {
    return NextResponse.json({ error: 'No booking found. Please check the details and try again.' }, { status: 404 });
  }

  if (booking.checkedInAt) {
    return NextResponse.json({
      alreadyCheckedIn: true,
      studentName: booking.studentName,
      className: `${booking.year} - ${booking.className}`,
      startTime: booking.startTime,
      endTime: booking.endTime,
      room: booking.room,
    });
  }

  // Check them in
  await db.update(bookings)
    .set({ checkedInAt: sql`datetime('now')` })
    .where(eq(bookings.id, booking.id));

  return NextResponse.json({
    success: true,
    studentName: booking.studentName,
    className: `${booking.year} - ${booking.className}`,
    startTime: booking.startTime,
    endTime: booking.endTime,
    room: booking.room,
  });
}
