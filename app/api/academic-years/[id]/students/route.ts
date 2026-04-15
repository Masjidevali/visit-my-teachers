import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allStudents = await db.select({
    id: students.id,
    studentId: students.studentId,
    name: students.name,
    classId: students.classId,
    className: classes.name,
    classYear: classes.year,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .where(eq(classes.academicYearId, parseInt(id)));

  return NextResponse.json(allStudents);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const academicYearId = parseInt(id);

  // Get all class IDs for this academic year
  const ayClasses = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.academicYearId, academicYearId));

  const classIds = ayClasses.map(c => c.id);

  if (classIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const result = await db.delete(students)
    .where(inArray(students.classId, classIds))
    .returning({ id: students.id });

  return NextResponse.json({ deleted: result.length });
}
