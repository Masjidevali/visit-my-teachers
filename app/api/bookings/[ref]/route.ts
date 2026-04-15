import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendCancellationConfirmation } from '@/lib/email';
import { formatDate, formatTime } from '@/lib/utils';

export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const booking = await db.select({
    id: bookings.id,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
    parentPhone: bookings.parentPhone,
    parentEmail: bookings.parentEmail,
    notes: bookings.notes,
    createdAt: bookings.createdAt,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    studentName: students.name,
    studentId: students.studentId,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    eventName: events.name,
    eventDate: eventClasses.date,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(bookings.bookingRef, ref.toUpperCase()))
    .get();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Strip teacher name if showTeacher is false
  const { showTeacher, ...bookingData } = booking;
  return NextResponse.json({
    ...bookingData,
    teacherName: showTeacher ? booking.teacherName : '',
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const booking = await db.select({
    id: bookings.id,
    timeSlotId: bookings.timeSlotId,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
    parentEmail: bookings.parentEmail,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    studentName: students.name,
    className: classes.name,
    year: classes.year,
    eventDate: eventClasses.date,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(bookings.bookingRef, ref.toUpperCase()))
    .get();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Free up the time slot
  await db.update(timeSlots).set({ isAvailable: true }).where(eq(timeSlots.id, booking.timeSlotId));

  // Delete the booking
  await db.delete(bookings).where(eq(bookings.id, booking.id));

  // Send cancellation email
  sendCancellationConfirmation({
    parentName: booking.parentName,
    parentEmail: booking.parentEmail,
    studentName: booking.studentName,
    className: `${booking.year} - ${booking.className}`,
    date: formatDate(booking.eventDate),
    time: `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`,
    bookingRef: booking.bookingRef,
  }).catch(err => console.error('Failed to send cancellation email:', err));

  return NextResponse.json({ success: true });
}
