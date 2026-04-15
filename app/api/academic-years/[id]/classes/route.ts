import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allClasses = await db.select().from(classes)
    .where(eq(classes.academicYearId, parseInt(id)));
  return NextResponse.json(allClasses);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { year, name, teacherName } = body;

  if (!year || !name) {
    return NextResponse.json({ error: 'Year and name are required' }, { status: 400 });
  }

  const result = await db.insert(classes).values({
    academicYearId: parseInt(id),
    year,
    name,
    teacherName: teacherName || '',
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
