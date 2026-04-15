import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sourceEventId, name } = await request.json();

  if (!sourceEventId || !name) {
    return NextResponse.json({ error: 'sourceEventId and name required' }, { status: 400 });
  }

  // Get source event
  const source = await db.select().from(events).where(eq(events.id, sourceEventId)).get();
  if (!source) {
    return NextResponse.json({ error: 'Source event not found' }, { status: 404 });
  }

  // Create new event (inactive by default)
  const newEvent = await db.insert(events).values({
    name,
    academicYearId: source.academicYearId,
    isActive: false,
  }).returning();

  // Copy event classes (without slots)
  const sourceClasses = await db.select().from(eventClasses).where(eq(eventClasses.eventId, sourceEventId));

  for (const ec of sourceClasses) {
    await db.insert(eventClasses).values({
      eventId: newEvent[0].id,
      classId: ec.classId,
      date: ec.date,
      startTime: ec.startTime,
      endTime: ec.endTime,
      slotDuration: ec.slotDuration,
      showTeacher: ec.showTeacher,
      room: ec.room,
    });
  }

  return NextResponse.json({ event: newEvent[0], classCount: sourceClasses.length }, { status: 201 });
}
