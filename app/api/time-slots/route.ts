import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, bookings } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventClassId = searchParams.get('eventClassId');

  if (!eventClassId) {
    return NextResponse.json({ error: 'eventClassId required' }, { status: 400 });
  }

  const slots = await db.select().from(timeSlots)
    .where(eq(timeSlots.eventClassId, parseInt(eventClassId)))
    .orderBy(timeSlots.startTime);

  return NextResponse.json(slots);
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventClassId = searchParams.get('eventClassId');

  if (!eventClassId) {
    return NextResponse.json({ error: 'eventClassId required' }, { status: 400 });
  }

  const ecId = parseInt(eventClassId);

  // Check if any slots have bookings
  const slotsWithBookings = await db.select({ id: timeSlots.id })
    .from(timeSlots)
    .innerJoin(bookings, eq(timeSlots.id, bookings.timeSlotId))
    .where(eq(timeSlots.eventClassId, ecId));

  if (slotsWithBookings.length > 0) {
    return NextResponse.json({ error: `Cannot remove slots: ${slotsWithBookings.length} slot(s) have bookings. Delete the bookings first.` }, { status: 409 });
  }

  // Delete all slots for this event class
  await db.delete(timeSlots).where(eq(timeSlots.eventClassId, ecId));

  return NextResponse.json({ success: true });
}
