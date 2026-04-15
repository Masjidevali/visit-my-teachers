import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings, timeSlots, students, classes, events, eventClasses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateBookingRef } from '@/lib/utils';
import { sendBookingConfirmation } from '@/lib/email';
import { formatDate, formatTime } from '@/lib/utils';

export async function POST(request: Request) {
  const body = await request.json();
  const { slotId, studentId, parentName, parentPhone, parentEmail, notes } = body;

  if (!slotId || !studentId || !parentName || !parentPhone || !parentEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify student and get details via eventClasses
  const student = await db.select({
    id: students.id,
    name: students.name,
    classId: students.classId,
    year: classes.year,
    className: classes.name,
    teacherName: classes.teacherName,
    showTeacher: eventClasses.showTeacher,
    room: eventClasses.room,
    eventDate: eventClasses.date,
    eventName: events.name,
  })
    .from(students)
    .innerJoin(classes, eq(students.classId, classes.id))
    .innerJoin(eventClasses, eq(eventClasses.classId, classes.id))
    .innerJoin(events, eq(eventClasses.eventId, events.id))
    .where(and(eq(students.id, studentId), eq(events.isActive, true)))
    .get();

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // Check if student already has a booking
  const existingBooking = await db.select()
    .from(bookings)
    .where(eq(bookings.studentId, studentId))
    .get();

  if (existingBooking) {
    return NextResponse.json({ error: 'This student already has a booking. Please cancel the existing one first.', bookingRef: existingBooking.bookingRef }, { status: 409 });
  }

  // Atomic booking: check slot + insert
  try {
    const slot = await db.select()
      .from(timeSlots)
      .where(and(eq(timeSlots.id, slotId), eq(timeSlots.isAvailable, true)))
      .get();

    if (!slot) {
      return NextResponse.json({ error: 'This slot is no longer available. Please choose another.' }, { status: 409 });
    }

    const bookingRef = generateBookingRef();

    await db.update(timeSlots).set({ isAvailable: false }).where(eq(timeSlots.id, slotId));

    const booking = await db.insert(bookings).values({
      timeSlotId: slotId,
      studentId,
      parentName,
      parentPhone,
      parentEmail,
      notes: notes || '',
      bookingRef,
    }).returning();

    // Send confirmation email (don't block on it)
    sendBookingConfirmation({
      parentName,
      parentEmail,
      studentName: student.name,
      className: `${student.year} - ${student.className}`,
      teacherName: student.showTeacher ? (student.teacherName || '') : '',
      date: formatDate(student.eventDate),
      time: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
      bookingRef,
      room: student.room || undefined,
      rawDate: student.eventDate,
      rawStartTime: slot.startTime,
      rawEndTime: slot.endTime,
    }).catch(err => console.error('Failed to send confirmation email:', err));

    return NextResponse.json({
      booking: booking[0],
      student: { name: student.name, year: student.year, className: student.className, teacherName: student.showTeacher ? student.teacherName : '', showTeacher: student.showTeacher },
      slot: { startTime: slot.startTime, endTime: slot.endTime },
      eventDate: student.eventDate,
    }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'This slot was just taken. Please choose another.' }, { status: 409 });
    }
    throw e;
  }
}
