import { NextResponse } from 'next/server';
import { db } from '@/db';
import { academicYears } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ay = await db.select().from(academicYears).where(eq(academicYears.id, parseInt(id))).get();

  if (!ay) {
    return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
  }

  return NextResponse.json(ay);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // If activating this academic year, deactivate all others first
  if (body.isActive === true) {
    await db.update(academicYears).set({ isActive: false });
  }

  const result = await db.update(academicYears)
    .set(body)
    .where(eq(academicYears.id, parseInt(id)))
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(academicYears).where(eq(academicYears.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
