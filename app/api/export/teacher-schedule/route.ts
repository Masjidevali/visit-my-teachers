import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, bookings, students, classes, events, eventClasses, specialRequests } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventClassId = searchParams.get('eventClassId');

  if (!eventClassId) {
    return NextResponse.json({ error: 'eventClassId required' }, { status: 400 });
  }

  const ecId = parseInt(eventClassId);

  const cls = await db.select({
    year: classes.year,
    name: classes.name,
    teacherName: classes.teacherName,
    room: eventClasses.room,
    eventName: events.name,
    eventDate: eventClasses.date,
  })
    .from(eventClasses)
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .where(eq(eventClasses.id, ecId))
    .get();

  if (!cls) {
    return NextResponse.json({ error: 'Event class not found' }, { status: 404 });
  }

  const slots = await db.select({
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
    isAvailable: timeSlots.isAvailable,
    parentName: bookings.parentName,
    parentPhone: bookings.parentPhone,
    notes: bookings.notes,
    studentName: students.name,
    studentIdStr: students.studentId,
  })
    .from(timeSlots)
    .leftJoin(bookings, eq(timeSlots.id, bookings.timeSlotId))
    .leftJoin(students, eq(bookings.studentId, students.id))
    .where(eq(timeSlots.eventClassId, ecId))
    .orderBy(timeSlots.startTime);

  // Get the classId from eventClasses for special requests lookup
  const ec = await db.select({ classId: eventClasses.classId })
    .from(eventClasses)
    .where(eq(eventClasses.id, ecId))
    .get();

  const requests = ec ? await db.select({
    studentId: specialRequests.studentId,
    requestType: specialRequests.requestType,
    reason: specialRequests.reason,
    status: specialRequests.status,
  })
    .from(specialRequests)
    .innerJoin(students, eq(specialRequests.studentId, students.id))
    .where(and(
      eq(students.classId, ec.classId),
      eq(specialRequests.status, 'approved'),
    )) : [];

  return NextResponse.json({ class: cls, slots, specialRequests: requests });
}
