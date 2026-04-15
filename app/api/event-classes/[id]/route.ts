import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const result = await db.update(eventClasses)
    .set(body)
    .where(eq(eventClasses.id, parseInt(id)))
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Event class not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(eventClasses).where(eq(eventClasses.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
