import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classes, events, eventClasses, timeSlots, bookings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429 });
  }

  const { studentId } = await request.json();

  if (!studentId || typeof studentId !== 'string') {
    return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
  }

  // Join: students -> classes -> eventClasses -> events
  const student = await db.select({
    id: students.id,
    studentId: students.studentId,
    name: students.name,
    classId: students.classId,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    eventClassId: eventClasses.id,
    eventId: events.id,
    eventName: events.name,
    eventDate: eventClasses.date,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .where(and(
      eq(students.studentId, studentId.trim().toUpperCase()),
      eq(events.isActive, true),
    ))
    .get();

  if (!student) {
    return NextResponse.json({ error: 'Student not found or no active Visit-My-Teachers event.' }, { status: 404 });
  }

  // Check if already booked
  const existingBooking = await db.select({
    bookingRef: bookings.bookingRef,
    startTime: timeSlots.startTime,
    endTime: timeSlots.endTime,
  })
    .from(bookings)
    .innerJoin(timeSlots, eq(bookings.timeSlotId, timeSlots.id))
    .where(eq(bookings.studentId, student.id))
    .get();

  // Get available slots via eventClassId
  const slots = await db.select()
    .from(timeSlots)
    .where(eq(timeSlots.eventClassId, student.eventClassId))
    .orderBy(timeSlots.startTime);

  // Strip teacher name if showTeacher is false
  const { showTeacher, ...studentData } = student;
  const safeStudent = {
    ...studentData,
    teacherName: showTeacher ? student.teacherName : '',
  };

  return NextResponse.json({
    student: safeStudent,
    existingBooking: existingBooking || null,
    slots,
  });
}
