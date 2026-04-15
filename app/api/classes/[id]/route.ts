import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Only allow updating class identity fields
  const { year, name, teacherName } = body;
  const updates: Record<string, unknown> = {};
  if (year !== undefined) updates.year = year;
  if (name !== undefined) updates.name = name;
  if (teacherName !== undefined) updates.teacherName = teacherName;

  const result = await db.update(classes)
    .set(updates)
    .where(eq(classes.id, parseInt(id)))
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(classes).where(eq(classes.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
