import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq, and, notInArray, sql } from 'drizzle-orm';
import { isAuthenticated } from '@/lib/auth';
import { generateBookingRef, formatDate, formatTime } from '@/lib/utils';
import { sendAutoAssignNotification } from '@/lib/email';

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  // Get all event classes for this event
  const ecList = await db.select({
    ecId: eventClasses.id,
    classId: eventClasses.classId,
    date: eventClasses.date,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    className: classes.name,
    year: classes.year,
    teacherName: classes.teacherName,
    eventName: events.name,
  })
    .from(eventClasses)
    .innerJoin(classes, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .where(eq(eventClasses.eventId, eventId));

  let assigned = 0;
  let noSlots = 0;
  const noSlotsStudents: string[] = [];
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const ec of ecList) {
    // Get students in this class who don't have a booking
    const bookedStudentIds = db.select({ studentId: bookings.studentId })
      .from(bookings)
      .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
      .where(eq(timeSlots.eventClassId, ec.ecId));

    const unbookedStudents = await db.select({
      id: students.id,
      name: students.name,
      parentEmail: students.parentEmail,
      studentId: students.studentId,
    })
      .from(students)
      .where(and(
        eq(students.classId, ec.classId),
        notInArray(students.id, bookedStudentIds),
      ));

    for (const student of unbookedStudents) {
      // Find first available slot for this event class
      const slot = await db.select()
        .from(timeSlots)
        .where(and(
          eq(timeSlots.eventClassId, ec.ecId),
          eq(timeSlots.isAvailable, true),
        ))
        .orderBy(timeSlots.startTime)
        .limit(1)
        .get();

      if (!slot) {
        noSlots++;
        noSlotsStudents.push(student.name);
        continue;
      }

      const bookingRef = generateBookingRef();

      // Create booking and mark slot
      await db.update(timeSlots).set({ isAvailable: false }).where(eq(timeSlots.id, slot.id));
      await db.insert(bookings).values({
        timeSlotId: slot.id,
        studentId: student.id,
        parentName: 'Auto-assigned',
        parentPhone: '',
        parentEmail: student.parentEmail || '',
        notes: 'Auto-assigned by admin',
        bookingRef,
      });

      assigned++;

      // Send notification email if parent has email
      if (student.parentEmail) {
        try {
          await sendAutoAssignNotification({
            parentEmail: student.parentEmail,
            studentName: student.name,
            className: `${ec.year} - ${ec.className}`,
            teacherName: ec.showTeacher ? (ec.teacherName || '') : '',
            date: formatDate(ec.date),
            time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
            bookingRef,
            room: ec.room || undefined,
            rescheduleUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://parents-evening.vercel.app'}/booking/${bookingRef}`,
          });
          emailsSent++;
        } catch {
          emailsFailed++;
        }
      }
    }
  }

  return NextResponse.json({ assigned, noSlots, noSlotsStudents, emailsSent, emailsFailed });
}
