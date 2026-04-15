import { NextResponse } from 'next/server';
import { db } from '@/db';
import { specialRequests, students, classes, eventClasses } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const requests = await db.select({
    id: specialRequests.id,
    parentName: specialRequests.parentName,
    parentEmail: specialRequests.parentEmail,
    parentPhone: specialRequests.parentPhone,
    requestType: specialRequests.requestType,
    reason: specialRequests.reason,
    contactNumber: specialRequests.contactNumber,
    status: specialRequests.status,
    adminNotes: specialRequests.adminNotes,
    createdAt: specialRequests.createdAt,
    studentName: students.name,
    studentIdStr: students.studentId,
    year: classes.year,
    className: classes.name,
  })
    .from(specialRequests)
    .innerJoin(students, eq(specialRequests.studentId, students.id))
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .where(eq(eventClasses.eventId, parseInt(eventId)))
    .orderBy(specialRequests.createdAt);

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { studentId, parentName, parentEmail, parentPhone, requestType, reason, bookingId, contactNumber } = body;

  if (!studentId || !parentName || !parentEmail || !parentPhone || !requestType || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await db.insert(specialRequests).values({
    studentId,
    parentName,
    parentEmail,
    parentPhone,
    requestType,
    reason,
    bookingId: bookingId || null,
    contactNumber: contactNumber || '',
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
