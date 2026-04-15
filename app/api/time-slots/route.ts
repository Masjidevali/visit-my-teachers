import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventClassId = searchParams.get('eventClassId');

  if (!eventClassId) {
    return NextResponse.json({ error: 'eventClassId required' }, { status: 400 });
  }

  const slots = await db.select().from(timeSlots)
    .where(eq(timeSlots.eventClassId, parseInt(eventClassId)))
    .orderBy(timeSlots.startTime);

  return NextResponse.json(slots);
}
