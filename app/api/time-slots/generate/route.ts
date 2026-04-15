import { NextResponse } from 'next/server';
import { db } from '@/db';
import { timeSlots, eventClasses, students, classes } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventClassId } = await request.json();

  if (!eventClassId) {
    return NextResponse.json({ error: 'eventClassId is required' }, { status: 400 });
  }

  const ec = await db.select().from(eventClasses).where(eq(eventClasses.id, eventClassId)).get();
  if (!ec) {
    return NextResponse.json({ error: 'Event class not found' }, { status: 404 });
  }

  // Count students in this class
  const classStudents = await db.select({ id: students.id })
    .from(students)
    .where(eq(students.classId, ec.classId));

  const studentCount = classStudents.length;

  if (studentCount === 0) {
    return NextResponse.json({ error: 'No students in this class. Import students first.' }, { status: 400 });
  }

  // Delete existing slots for this event class
  await db.delete(timeSlots).where(eq(timeSlots.eventClassId, eventClassId));

  // Generate one slot per student, starting from startTime
  const [startH, startM] = ec.startTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  const inserted = [];
  for (let i = 0; i < studentCount; i++) {
    const slotStart = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
    const slotEndMin = currentMinutes + ec.slotDuration;
    const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

    const result = await db.insert(timeSlots).values({
      eventClassId,
      startTime: slotStart,
      endTime: slotEnd,
    }).returning();
    inserted.push(result[0]);

    currentMinutes = slotEndMin;
  }

  // Calculate and store the derived end time on the event class
  const finalEndTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
  await db.update(eventClasses).set({ endTime: finalEndTime }).where(eq(eventClasses.id, eventClassId));

  return NextResponse.json({ count: inserted.length, slots: inserted, endTime: finalEndTime });
}
