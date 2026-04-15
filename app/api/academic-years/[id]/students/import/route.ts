import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const academicYearId = parseInt(id);
  const body = await request.json();
  const { rows } = body as {
    rows: Array<{ studentId: string; name: string; className: string; parentEmail?: string; ccEmails?: string }>;
  };

  if (!rows?.length) {
    return NextResponse.json({ error: 'rows are required' }, { status: 400 });
  }

  // Get classes for this academic year - match by "year - name" or just "name"
  const ayClasses = await db.select().from(classes).where(eq(classes.academicYearId, academicYearId));
  const classMap = new Map<string, number>();
  for (const c of ayClasses) {
    classMap.set(`${c.year} - ${c.name}`.toLowerCase(), c.id);
    classMap.set(c.name.toLowerCase(), c.id);
  }

  const results = { imported: 0, errors: [] as string[] };

  for (const row of rows) {
    const classId = classMap.get(row.className.trim().toLowerCase());
    if (!classId) {
      results.errors.push(`Row "${row.studentId}": class "${row.className}" not found. Use format "Year - ClassName" or just "ClassName"`);
      continue;
    }

    try {
      await db.insert(students).values({
        studentId: row.studentId.trim().toUpperCase(),
        name: row.name.trim(),
        parentEmail: row.parentEmail?.trim() || null,
        ccEmails: row.ccEmails?.trim() || null,
        classId,
      });
      results.imported++;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      if (message.includes('UNIQUE')) {
        results.errors.push(`Row "${row.studentId}": duplicate student ID for this class`);
      } else {
        results.errors.push(`Row "${row.studentId}": ${message}`);
      }
    }
  }

  return NextResponse.json(results);
}
