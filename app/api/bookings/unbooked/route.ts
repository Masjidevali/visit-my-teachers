import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes, bookings, eventClasses, unbookedReminders } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const parsedEventId = parseInt(eventId);

  const allStudents = await db.select({
    id: students.id,
    studentId: students.studentId,
    name: students.name,
    parentEmail: students.parentEmail,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    bookingId: bookings.id,
    reminderSentAt: unbookedReminders.sentAt,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .leftJoin(bookings, eq(students.id, bookings.studentId))
    .leftJoin(unbookedReminders, and(
      eq(unbookedReminders.studentId, students.id),
      eq(unbookedReminders.eventId, parsedEventId),
    ))
    .where(eq(eventClasses.eventId, parsedEventId));

  const unbooked = allStudents.filter(s => s.bookingId === null);

  return NextResponse.json({
    total: allStudents.length,
    unbooked: unbooked.length,
    students: unbooked,
  });
}
