import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classes } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const academicYearId = parseInt(id);
  const body = await request.json();
  const { rows } = body as {
    rows: Array<{
      year: string;
      name: string;
      teacherName?: string;
    }>;
  };

  if (!rows?.length) {
    return NextResponse.json({ error: 'rows are required' }, { status: 400 });
  }

  const results = { imported: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 1;

    if (!row.year || !row.name) {
      results.errors.push(`Line ${lineNum}: missing required fields (year, name)`);
      continue;
    }

    try {
      await db.insert(classes).values({
        academicYearId,
        year: row.year.trim(),
        name: row.name.trim(),
        teacherName: row.teacherName?.trim() || '',
      });
      results.imported++;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      if (message.includes('UNIQUE')) {
        results.errors.push(`Line ${lineNum} "${row.name}": duplicate year+class name`);
      } else {
        results.errors.push(`Line ${lineNum} "${row.name}": ${message}`);
      }
    }
  }

  return NextResponse.json(results);
}
