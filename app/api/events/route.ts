import { NextResponse } from 'next/server';
import { db } from '@/db';
import { events, academicYears } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  const allEvents = await db.select({
    id: events.id,
    name: events.name,
    academicYearId: events.academicYearId,
    academicYearName: academicYears.name,
    isActive: events.isActive,
    createdAt: events.createdAt,
  })
    .from(events)
    .innerJoin(academicYears, eq(events.academicYearId, academicYears.id))
    .orderBy(desc(events.createdAt));
  return NextResponse.json(allEvents);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, academicYearId } = body;

  if (!name || !academicYearId) {
    return NextResponse.json({ error: 'Name and academic year are required' }, { status: 400 });
  }

  const result = await db.insert(events).values({ name, academicYearId }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
