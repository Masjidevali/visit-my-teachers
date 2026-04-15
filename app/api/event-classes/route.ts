import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eventClasses, classes, timeSlots } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const rows = await db.select({
    id: eventClasses.id,
    eventId: eventClasses.eventId,
    classId: eventClasses.classId,
    date: eventClasses.date,
    startTime: eventClasses.startTime,
    endTime: eventClasses.endTime,
    slotDuration: eventClasses.slotDuration,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    year: classes.year,
    name: classes.name,
    teacherName: classes.teacherName,
  })
    .from(eventClasses)
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, parseInt(eventId)));

  // Get slot counts per event class
  const slotCounts = await db.select({
    eventClassId: timeSlots.eventClassId,
    count: sql<number>`count(*)`.as('count'),
  })
    .from(timeSlots)
    .groupBy(timeSlots.eventClassId);

  const countMap = new Map(slotCounts.map(s => [s.eventClassId, s.count]));
  const result = rows.map(r => ({ ...r, slotCount: countMap.get(r.id) || 0 }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, classId, date, startTime, endTime, slotDuration, showTeacher, room } = body;

  if (!eventId || !classId || !date) {
    return NextResponse.json({ error: 'eventId, classId, and date are required' }, { status: 400 });
  }

  const result = await db.insert(eventClasses).values({
    eventId,
    classId,
    date,
    startTime: startTime || '16:00',
    endTime: endTime || '19:00',
    slotDuration: slotDuration || 5,
    showTeacher: showTeacher !== undefined ? showTeacher : true,
    room: room || '',
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
