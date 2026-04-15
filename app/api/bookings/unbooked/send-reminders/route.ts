import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes, events, eventClasses, bookings, unbookedReminders } from '@/db/schema';
import { isAuthenticated } from '@/lib/auth';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { sendUnbookedReminder } from '@/lib/email';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, studentIds } = await request.json() as { eventId: number; studentIds?: number[] };

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  const parsedEventId = parseInt(eventId);

  // Get the event name
  const event = await db.select({ name: events.name })
    .from(events)
    .where(eq(events.id, parsedEventId))
    .get();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Find unbooked students with parent email who haven't been reminded yet
  const allStudents = await db.select({
    id: students.id,
    studentId: students.studentId,
    name: students.name,
    parentEmail: students.parentEmail,
    ccEmails: students.ccEmails,
    className: classes.name,
    bookingId: bookings.id,
    reminderSentAt: unbookedReminders.sentAt,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .leftJoin(bookings, eq(students.id, bookings.studentId))
    .leftJoin(unbookedReminders, and(
      eq(unbookedReminders.studentId, students.id),
      eq(unbookedReminders.eventId, parsedEventId),
    ))
    .where(eq(eventClasses.eventId, parsedEventId));

  const unbooked = allStudents.filter(s => s.bookingId === null);

  // Deduplicate by student id (a student could appear in multiple classes)
  const seen = new Set<number>();
  const selectedSet = studentIds ? new Set(studentIds) : null;
  const unique = unbooked.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    // If specific students requested, only include those
    if (selectedSet && !selectedSet.has(s.id)) return false;
    return true;
  });

  let sent = 0;
  let skippedNoEmail = 0;
  let skippedAlreadySent = 0;
  let errors = 0;

  for (const student of unique) {
    if (!student.parentEmail) {
      skippedNoEmail++;
      continue;
    }

    if (student.reminderSentAt) {
      skippedAlreadySent++;
      continue;
    }

    try {
      await sendUnbookedReminder({
        parentEmail: student.parentEmail,
        studentName: student.name,
        className: student.className,
        studentId: student.studentId,
        eventName: event.name,
        cc: student.ccEmails || undefined,
      });

      await db.insert(unbookedReminders).values({
        eventId: parsedEventId,
        studentId: student.id,
      });

      sent++;

      // 200ms delay between sends to avoid Gmail throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Failed to send reminder to ${student.parentEmail}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, skippedNoEmail, skippedAlreadySent, errors });
}
