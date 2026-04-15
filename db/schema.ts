import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const academicYears = sqliteTable('academic_years', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('academic_year_name_idx').on(table.name),
]);

export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  academicYearId: integer('academic_year_id').notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  year: text('year').notNull(),
  name: text('name').notNull(),
  teacherName: text('teacher_name').default(''),
}, (table) => [
  uniqueIndex('ay_class_idx').on(table.academicYearId, table.year, table.name),
]);

export const students = sqliteTable('students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: text('student_id').notNull(),
  name: text('name').notNull(),
  parentEmail: text('parent_email'),
  ccEmails: text('cc_emails'),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('student_class_idx').on(table.studentId, table.classId),
]);

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  academicYearId: integer('academic_year_id').notNull().references(() => academicYears.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const eventClasses = sqliteTable('event_classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  startTime: text('start_time').notNull().default('16:00'),
  endTime: text('end_time').notNull().default('19:00'),
  slotDuration: integer('slot_duration').notNull().default(5),
  showTeacher: integer('show_teacher', { mode: 'boolean' }).notNull().default(true),
  room: text('room').default(''),
}, (table) => [
  uniqueIndex('event_class_unique_idx').on(table.eventId, table.classId),
]);

export const timeSlots = sqliteTable('time_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventClassId: integer('event_class_id').notNull().references(() => eventClasses.id, { onDelete: 'cascade' }),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  uniqueIndex('event_class_time_idx').on(table.eventClassId, table.startTime),
]);

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timeSlotId: integer('time_slot_id').notNull().references(() => timeSlots.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  parentName: text('parent_name').notNull(),
  parentPhone: text('parent_phone').notNull(),
  parentEmail: text('parent_email').notNull(),
  notes: text('notes').default(''),
  bookingRef: text('booking_ref').notNull(),
  reminderSent: integer('reminder_sent', { mode: 'boolean' }).notNull().default(false),
  checkedInAt: text('checked_in_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('booking_slot_idx').on(table.timeSlotId),
  uniqueIndex('booking_ref_idx').on(table.bookingRef),
  index('booking_student_idx').on(table.studentId),
]);

export const specialRequests = sqliteTable('special_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  parentName: text('parent_name').notNull(),
  parentEmail: text('parent_email').notNull(),
  parentPhone: text('parent_phone').notNull(),
  requestType: text('request_type').notNull(),
  reason: text('reason').notNull(),
  contactNumber: text('contact_number').default(''),
  status: text('status').notNull().default('pending'),
  adminNotes: text('admin_notes').default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const unbookedReminders = sqliteTable('unbooked_reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  sentAt: text('sent_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex('unbooked_reminder_idx').on(table.eventId, table.studentId),
]);
