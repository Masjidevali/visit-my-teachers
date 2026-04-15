import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, eventClasses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  // Find the booking and its event class
  const booking = await db.select({
    id: bookings.id,
    timeSlotId: bookings.timeSlotId,
    eventClassId: eventClasses.id,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .where(eq(bookings.bookingRef, ref.toUpperCase()))
    .get();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Get all slots for this event class
  const slots = await db.select({
    id: timeSlots.id,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    isAvailable: timeSlots.isAvailable,
  })
    .from(timeSlots)
    .where(eq(timeSlots.eventClassId, booking.eventClassId))
    .orderBy(timeSlots.startTime);

  return NextResponse.json({
    slots,
    currentSlotId: booking.timeSlotId,
  });
}
