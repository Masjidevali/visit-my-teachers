import { NextResponse } from 'next/server';
import { db } from '@/db';
import { activityLog } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  const logs = await db.select()
    .from(activityLog)
    .orderBy(sql`${activityLog.createdAt} desc`)
    .limit(limit);

  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, detail } = await request.json();

  if (!action) {
    return NextResponse.json({ error: 'action required' }, { status: 400 });
  }

  const result = await db.insert(activityLog).values({
    action,
    detail: detail || '',
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
