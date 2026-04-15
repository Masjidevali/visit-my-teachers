import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

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
    parentEmail: bookings.parentEmail,
    notes: bookings.notes,
    createdAt: bookings.createdAt,
    timeSlotId: bookings.timeSlotId,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    studentName: students.name,
    studentIdStr: students.studentId,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(eventClasses.eventId, parseInt(eventId)))
    .orderBy(classes.name, timeSlots.startTime);

  return NextResponse.json(allBookings);
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, parentName, parentPhone, parentEmail, notes } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Booking id required' }, { status: 400 });
  }

  await db.update(bookings)
    .set({
      ...(parentName !== undefined && { parentName }),
      ...(parentPhone !== undefined && { parentPhone }),
      ...(parentEmail !== undefined && { parentEmail }),
      ...(notes !== undefined && { notes }),
    })
    .where(eq(bookings.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, timeSlotId } = await request.json();

  if (!id || !timeSlotId) {
    return NextResponse.json({ error: 'Booking id and timeSlotId required' }, { status: 400 });
  }

  // Free the time slot
  await db.update(timeSlots).set({ isAvailable: true }).where(eq(timeSlots.id, timeSlotId));

  // Delete the booking
  await db.delete(bookings).where(eq(bookings.id, id));

  logActivity('Booking deleted', `Booking ID ${id} deleted by admin`);

  return NextResponse.json({ success: true });
}
