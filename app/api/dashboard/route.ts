import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, bookings, classes, specialRequests, eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, count } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const eid = parseInt(eventId);

  // Total students for this event (via eventClasses)
  const totalStudents = await db.select({ count: count() })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, eid));

  // Total bookings
  const totalBookings = await db.select({ count: count() })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, eid));

  // Total classes in event
  const totalClasses = await db.select({ count: count() })
    .from(eventClasses)
    .where(eq(eventClasses.eventId, eid));

  // Pending special requests
  const pendingRequests = await db.select({ count: count() })
    .from(specialRequests)
    .innerJoin(students, eq(specialRequests.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, eid));

  return NextResponse.json({
    totalStudents: totalStudents[0].count,
    totalBookings: totalBookings[0].count,
    totalClasses: totalClasses[0].count,
    unbookedStudents: totalStudents[0].count - totalBookings[0].count,
    pendingRequests: pendingRequests[0].count,
  });
}
