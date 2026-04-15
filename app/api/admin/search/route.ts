import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes, bookings, timeSlots, eventClasses, events } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const results = await db.select({
    id: students.id,
    studentId: students.studentId,
    name: students.name,
    year: classes.year,
    className: classes.name,
    bookingRef: bookings.bookingRef,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .leftJoin(bookings, eq(bookings.studentId, students.id))
    .where(sql`${students.name} LIKE ${'%' + q + '%'} OR ${students.studentId} = ${q.toUpperCase()}`)
    .limit(10);

  return NextResponse.json(results);
}
