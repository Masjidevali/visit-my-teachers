import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(students).where(eq(students.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
