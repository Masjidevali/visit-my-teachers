import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, classIds, defaults } = body as {
    eventId: number;
    classIds: number[];
    defaults: {
      date: string;
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      showTeacher?: boolean;
      room?: string;
    };
  };

  if (!eventId || !classIds?.length || !defaults?.date) {
    return NextResponse.json({ error: 'eventId, classIds, and defaults.date are required' }, { status: 400 });
  }

  const values = classIds.map(classId => ({
    eventId,
    classId,
    date: defaults.date,
    startTime: defaults.startTime || '16:00',
    endTime: defaults.endTime || '19:00',
    slotDuration: defaults.slotDuration || 5,
    showTeacher: defaults.showTeacher !== undefined ? defaults.showTeacher : true,
    room: defaults.room || '',
  }));

  const result = await db.insert(eventClasses).values(values).returning();
  return NextResponse.json(result, { status: 201 });
}
