import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.select().from(events).where(eq(events.id, parseInt(id))).get();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const result = await db.update(events)
    .set(body)
    .where(eq(events.id, parseInt(id)))
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(events).where(eq(events.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
