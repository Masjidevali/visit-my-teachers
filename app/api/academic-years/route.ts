import { NextResponse } from 'next/server';
import { db } from '@/db';
import { academicYears } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { desc } from 'drizzle-orm';

export async function GET() {
  const all = await db.select().from(academicYears).orderBy(desc(academicYears.createdAt));
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const result = await db.insert(academicYears).values({ name }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
