import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventClasses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const dates = await db.selectDistinct({ date: eventClasses.date })
    .from(eventClasses)
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .where(eq(events.isActive, true))
    .orderBy(eventClasses.date);

  return NextResponse.json({ dates: dates.map(d => d.date) });
}
