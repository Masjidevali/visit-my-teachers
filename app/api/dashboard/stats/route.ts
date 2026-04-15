import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, eventClasses, classes, students, events } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';

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

  // Bookings per day
  const bookingsPerDay = await db.select({
    date: sql<string>`date(${bookings.createdAt})`.as('booking_date'),
    count: sql<number>`count(*)`.as('count'),
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .where(eq(eventClasses.eventId, eid))
    .groupBy(sql`date(${bookings.createdAt})`)
    .orderBy(sql`date(${bookings.createdAt})`);

  // Per-class stats
  const ecList = await db.select({
    ecId: eventClasses.id,
    classId: eventClasses.classId,
    className: classes.name,
    year: classes.year,
  })
    .from(eventClasses)
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, eid));

  const classStats = await Promise.all(
    ecList.map(async (ec) => {
      const totalStudents = await db.select({ count: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.classId, ec.classId))
        .get();

      const bookedStudents = await db.select({ count: sql<number>`count(*)` })
        .from(bookings)
        .innerJoin(students, eq(bookings.studentId, students.id))
        .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
        .where(and(
          eq(students.classId, ec.classId),
          eq(timeSlots.eventClassId, ec.ecId),
        ))
        .get();

      return {
        className: ec.className,
        year: ec.year,
        totalStudents: totalStudents?.count || 0,
        bookedStudents: bookedStudents?.count || 0,
      };
    })
  );

  // Recent bookings (last 10)
  const recentBookings = await db.select({
    id: bookings.id,
    bookingRef: bookings.bookingRef,
    studentName: students.name,
    className: classes.name,
    year: classes.year,
    parentName: bookings.parentName,
    createdAt: bookings.createdAt,
    startTime: timeSlots.startTime,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .innerJoin(eventClasses, eq(timeSlots.eventClassId, eventClasses.id))
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(eventClasses.eventId, eid))
    .orderBy(sql`${bookings.createdAt} desc`)
    .limit(10);

  return NextResponse.json({ bookingsPerDay, classStats, recentBookings });
}
