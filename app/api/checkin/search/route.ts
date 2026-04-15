import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, eventClasses, classes, students } from '@/db/schema';
import { eq, like, or, sql } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const q = searchParams.get('q')?.trim();

  if (!eventId || !q) {
    return NextResponse.json({ error: 'eventId and q required' }, { status: 400 });
  }

  const results = await db.select({
    id: bookings.id,
    bookingRef: bookings.bookingRef,
    parentName: bookings.parentName,
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
    .where(
      sql`${eventClasses.eventId} = ${parseInt(eventId)} AND (
        ${students.name} LIKE ${'%' + q + '%'} OR
        ${bookings.bookingRef} = ${q.toUpperCase()} OR
        ${students.studentId} = ${q.toUpperCase()}
      )`
    )
    .limit(20);

  return NextResponse.json(results);
}
