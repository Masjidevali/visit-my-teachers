import { NextResponse } from 'next/server';
import { db } from '@/db';
import { specialRequests, students } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { sendRequestStatusEmail } from '@/lib/email';
import { formatRequestType } from '@/lib/utils';
import { logActivity } from '@/lib/activity';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, adminNotes } = body as { status: 'approved' | 'rejected'; adminNotes?: string };

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await db.update(specialRequests)
    .set({
      status,
      adminNotes: adminNotes || '',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(specialRequests.id, parseInt(id)))
    .returning();

  if (!result.length) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const req = result[0];

  // Get student name for the email
  const student = await db.select().from(students).where(eq(students.id, req.studentId)).get();

  // Send status email (don't block)
  sendRequestStatusEmail({
    parentName: req.parentName,
    parentEmail: req.parentEmail,
    studentName: student?.name || 'Unknown',
    requestType: formatRequestType(req.requestType),
    status,
    adminNotes: adminNotes || undefined,
  }).catch(err => console.error('Failed to send request status email:', err));

  logActivity(`Special request ${status}`, `Request #${id} for ${student?.name || 'Unknown'} ${status}`);

  return NextResponse.json(result[0]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await db.delete(specialRequests).where(eq(specialRequests.id, parseInt(id)));

  logActivity('Special request deleted', `Request #${id} deleted by admin`);

  return NextResponse.json({ success: true });
}
