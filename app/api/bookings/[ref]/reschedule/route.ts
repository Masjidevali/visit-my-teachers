import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendRescheduleConfirmation } from '@/lib/email';
import { formatDate, formatTime } from '@/lib/utils';

export async function PUT(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { newSlotId } = await request.json();

  if (!newSlotId) {
    return NextResponse.json({ error: 'Missing newSlotId' }, { status: 400 });
  }

  // Find the booking with full details
  const booking = await db.select({
    id: bookings.id,
    timeSlotId: bookings.timeSlotId,
    parentName: bookings.parentName,
    parentEmail: bookings.parentEmail,
    bookingRef: bookings.bookingRef,
    studentName: students.name,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    eventDate: eventClasses.date,
    eventClassId: eventClasses.id,
    eventName: events.name,
    oldStartTime: timeSlots.startTime,
    oldEndTime: timeSlots.endTime,
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

  // Same slot — no-op
  if (booking.timeSlotId === newSlotId) {
    return NextResponse.json({ message: 'Already booked for this slot' });
  }

  // Verify new slot exists, belongs to same event class, and is available
  const newSlot = await db.select()
    .from(timeSlots)
    .where(and(
      eq(timeSlots.id, newSlotId),
      eq(timeSlots.eventClassId, booking.eventClassId),
      eq(timeSlots.isAvailable, true),
    ))
    .get();

  if (!newSlot) {
    return NextResponse.json({ error: 'This slot is no longer available. Please choose another.' }, { status: 409 });
  }

  // Atomically swap: mark new slot unavailable, update booking, free old slot
  await db.update(timeSlots).set({ isAvailable: false }).where(eq(timeSlots.id, newSlotId));
  await db.update(bookings).set({ timeSlotId: newSlotId }).where(eq(bookings.id, booking.id));
  await db.update(timeSlots).set({ isAvailable: true }).where(eq(timeSlots.id, booking.timeSlotId));

  // Send reschedule confirmation email
  sendRescheduleConfirmation({
    parentName: booking.parentName,
    parentEmail: booking.parentEmail,
    studentName: booking.studentName,
    className: `${booking.year} - ${booking.className}`,
    teacherName: booking.showTeacher ? (booking.teacherName || '') : '',
    date: formatDate(booking.eventDate),
    oldTime: `${formatTime(booking.oldStartTime)} - ${formatTime(booking.oldEndTime)}`,
    newTime: `${formatTime(newSlot.startTime)} - ${formatTime(newSlot.endTime)}`,
    bookingRef: booking.bookingRef,
    room: booking.room || undefined,
    rawDate: booking.eventDate,
    rawStartTime: newSlot.startTime,
    rawEndTime: newSlot.endTime,
  }).catch(err => console.error('Failed to send reschedule email:', err));

  return NextResponse.json({
    success: true,
    newStartTime: newSlot.startTime,
    newEndTime: newSlot.endTime,
  });
}
