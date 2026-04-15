import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes, eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  const classId = searchParams.get('classId');
  const academicYearId = searchParams.get('academicYearId');

  if (classId) {
    const result = await db.select().from(students).where(eq(students.classId, parseInt(classId)));
    return NextResponse.json(result);
  }

  if (eventId) {
    const result = await db.select({
      id: students.id,
      studentId: students.studentId,
      name: students.name,
      classId: students.classId,
      year: classes.year,
      className: classes.name,
      teacherName: classes.teacherName,
    })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
      .where(eq(eventClasses.eventId, parseInt(eventId)));
    return NextResponse.json(result);
  }

  if (academicYearId) {
    const result = await db.select({
      id: students.id,
      studentId: students.studentId,
      name: students.name,
      classId: students.classId,
      year: classes.year,
      className: classes.name,
      teacherName: classes.teacherName,
    })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(classes.academicYearId, parseInt(academicYearId)));
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'eventId, classId, or academicYearId required' }, { status: 400 });
}
