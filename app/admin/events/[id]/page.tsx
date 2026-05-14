'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { showToast } from '@/app/components/Toast';
import { EmptyState } from '@/app/components/EmptyState';
import { formatDate, formatTime } from '@/lib/utils';

interface Event {
  id: number;
  name: string;
  academicYearId: number;
}

interface AcademicYearClass {
  id: number;
  year: string;
  name: string;
  teacherName: string;
}

interface EventClass {
  id: number;
  eventId: number;
  classId: number;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  showTeacher: boolean;
  room: string;
  year: string;
  name: string;
  teacherName: string;
  slotCount: number;
}

interface Booking {
  id: number;
  bookingRef: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
  timeSlotId: number;
  startTime: string;
  endTime: string;
  studentName: string;
  studentIdStr: string;
  year: string;
  className: string;
  teacherName: string;
}

interface UnbookedStudent {
  id: number;
  studentId: string;
  name: string;
  year: string;
  className: string;
  teacherName: string;
  parentEmail: string | null;
  reminderSentAt: string | null;
}

interface Student {
  id: number;
  studentId: string;
  name: string;
  classId: number;
  year: string;
  className: string;
  teacherName: string;
}

interface SpecialRequest {
  id: number;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  requestType: string;
  reason: string;
  contactNumber: string;
  status: string;
  adminNotes: string;
  studentName: string;
  studentIdStr: string;
  className: string;
}

type Tab = 'classes' | 'students' | 'schedule' | 'bookings' | 'unbooked' | 'requests' | 'export';

function BookingsTab({ bookings, loadBookings, loadUnbooked, eventId }: { bookings: Booking[]; loadBookings: () => void; loadUnbooked: () => void; eventId: string }) {
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ parentName: '', parentPhone: '', parentEmail: '', notes: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ sent: number; skippedAlreadySent: number; errors: number } | null>(null);

  function startEdit(b: Booking) {
    setEditingBooking(b);
    setEditForm({ parentName: b.parentName, parentPhone: b.parentPhone, parentEmail: b.parentEmail, notes: b.notes || '' });
  }

  async function saveEdit() {
    if (!editingBooking) return;
    setSavingEdit(true);
    const res = await fetch('/api/bookings/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingBooking.id, ...editForm }),
    });
    if (res.ok) {
      setEditingBooking(null);
      loadBookings();
    }
    setSavingEdit(false);
  }

  async function deleteBooking(b: Booking) {
    setDeletingId(b.id);
    const res = await fetch('/api/bookings/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, timeSlotId: b.timeSlotId }),
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      loadBookings();
      loadUnbooked();
    }
    setDeletingId(null);
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} booking(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const toDelete = bookings.filter(b => selectedIds.has(b.id));
    for (const b of toDelete) {
      await fetch('/api/bookings/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id, timeSlotId: b.timeSlotId }),
      });
    }
    setSelectedIds(new Set());
    setBulkDeleting(false);
    loadBookings();
    loadUnbooked();
    showToast(`Deleted ${toDelete.length} booking(s)`, 'success');
  }

  async function handleSendReminders(bookingIds?: number[]) {
    const count = bookingIds ? bookingIds.length : bookings.length;
    const label = bookingIds
      ? `${count} selected booking${count !== 1 ? 's' : ''}`
      : `all ${count} booked parent${count !== 1 ? 's' : ''} for this event`;
    const forceNote = forceResend ? ' (re-sending to everyone, including already reminded)' : '';
    if (!confirm(`Send reminder emails to ${label}?${forceNote}`)) return;
    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch('/api/bookings/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, bookingIds, force: forceResend }),
      });
      if (res.ok) {
        setReminderResult(await res.json());
        setSelectedIds(new Set());
        loadBookings();
      } else {
        setReminderResult({ sent: 0, skippedAlreadySent: 0, errors: 1 });
        showToast('Failed to send reminders', 'error');
      }
    } catch {
      setReminderResult({ sent: 0, skippedAlreadySent: 0, errors: 1 });
      showToast('Failed to send reminders', 'error');
    } finally {
      setSendingReminders(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">All Bookings ({bookings.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          {bookings.length > 0 && (
            <a
              href={`/api/export/bookings-csv?eventId=${eventId}`}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </a>
          )}
          {bookings.length > 0 && (
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 select-none">
              <input
                type="checkbox"
                checked={forceResend}
                onChange={e => setForceResend(e.target.checked)}
                className="rounded border-gray-300"
              />
              Force re-send
            </label>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={() => handleSendReminders(Array.from(selectedIds))}
              disabled={sendingReminders}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {sendingReminders ? 'Sending...' : `Send Reminder (${selectedIds.size})`}
            </button>
          )}
          {bookings.length > 0 && (
            <button
              onClick={() => handleSendReminders()}
              disabled={sendingReminders}
              className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {sendingReminders ? 'Sending...' : 'Send Reminders to All'}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {reminderResult && (
        <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm">
          {reminderResult.sent > 0 && (
            <p className="text-green-700 font-medium">Sent {reminderResult.sent} reminder{reminderResult.sent !== 1 ? 's' : ''} successfully.</p>
          )}
          {reminderResult.skippedAlreadySent > 0 && (
            <p className="text-gray-600">{reminderResult.skippedAlreadySent} parent{reminderResult.skippedAlreadySent !== 1 ? 's' : ''} already reminded — skipped. Tick &lsquo;Force re-send&rsquo; to send again.</p>
          )}
          {reminderResult.errors > 0 && (
            <p className="text-red-600">{reminderResult.errors} email{reminderResult.errors !== 1 ? 's' : ''} failed to send.</p>
          )}
          {reminderResult.sent === 0 && reminderResult.skippedAlreadySent === 0 && reminderResult.errors === 0 && (
            <p className="text-gray-600">No bookings matched.</p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="font-semibold mb-1">Edit Booking</h3>
            <p className="text-sm text-gray-500 mb-4">{editingBooking.studentName} — {editingBooking.bookingRef}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                <input type="text" value={editForm.parentName} onChange={e => setEditForm(f => ({ ...f, parentName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editForm.parentPhone} onChange={e => setEditForm(f => ({ ...f, parentPhone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.parentEmail} onChange={e => setEditForm(f => ({ ...f, parentEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveEdit} disabled={savingEdit} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50">
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingBooking(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={bookings.length > 0 && selectedIds.size === bookings.length} onChange={e => setSelectedIds(e.target.checked ? new Set(bookings.map(b => b.id)) : new Set())} className="rounded border-gray-300" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Class</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Parent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ref</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(b.id)} onChange={e => { const s = new Set(selectedIds); e.target.checked ? s.add(b.id) : s.delete(b.id); setSelectedIds(s); }} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.startTime} - {b.endTime}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{b.studentName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.className}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.parentName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.parentPhone}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{b.bookingRef}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {confirmDeleteId === b.id ? (
                      <span className="inline-flex gap-1">
                        <button onClick={() => deleteBooking(b)} disabled={deletingId === b.id} className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50">
                          {deletingId === b.id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 hover:underline">
                          No
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1">
                        <button onClick={() => startEdit(b)} className="text-xs text-primary hover:underline">Edit</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setConfirmDeleteId(b.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && (
          <EmptyState icon="clipboard" title="No bookings yet" description="Bookings will appear here once parents start booking slots." />
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'classes';

  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Academic year classes (available for selection)
  const [ayClasses, setAyClasses] = useState<AcademicYearClass[]>([]);
  // Event classes (selected + configured)
  const [eventClasses, setEventClasses] = useState<EventClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unbooked, setUnbooked] = useState<{ total: number; unbooked: number; students: UnbookedStudent[] }>({ total: 0, unbooked: 0, students: [] });
  const [requests, setRequests] = useState<SpecialRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Class selection state
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<number>>(new Set());
  const [defaults, setDefaults] = useState({ date: '', startTime: '16:00', slotDuration: 5, showTeacher: true, room: '' });

  // Unbooked reminder state
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ sent: number; skippedNoEmail: number; skippedAlreadySent: number; errors: number } | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [unbookedForceResend, setUnbookedForceResend] = useState(false);

  // Auto-assign state
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<{ assigned: number; noSlots: number; noSlotsStudents: string[]; emailsSent: number; emailsFailed: number } | null>(null);

  // Editing event class config
  const [editingEcId, setEditingEcId] = useState<number | null>(null);
  const [editEcForm, setEditEcForm] = useState({ date: '', startTime: '16:00', slotDuration: 5, showTeacher: true, room: '' });

  const loadEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`);
    if (!res.ok) { router.push('/admin/events'); return; }
    const ev = await res.json();
    setEvent(ev);
    // Load academic year classes
    const ayRes = await fetch(`/api/academic-years/${ev.academicYearId}/classes`);
    setAyClasses(await ayRes.json());
  }, [id, router]);

  const loadEventClasses = useCallback(async () => {
    const res = await fetch(`/api/event-classes?eventId=${id}`);
    setEventClasses(await res.json());
  }, [id]);

  const loadBookings = useCallback(async () => {
    const res = await fetch(`/api/bookings/admin?eventId=${id}`);
    setBookings(await res.json());
  }, [id]);

  const loadUnbooked = useCallback(async () => {
    const res = await fetch(`/api/bookings/unbooked?eventId=${id}`);
    setUnbooked(await res.json());
  }, [id]);

  const loadStudents = useCallback(async () => {
    const res = await fetch(`/api/students?eventId=${id}`);
    setStudents(await res.json());
  }, [id]);

  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/special-requests?eventId=${id}`);
    setRequests(await res.json());
  }, [id]);

  useEffect(() => {
    loadEvent();
    loadEventClasses();
  }, [loadEvent, loadEventClasses]);

  useEffect(() => {
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'bookings' || activeTab === 'schedule') loadBookings();
    if (activeTab === 'unbooked') loadUnbooked();
    if (activeTab === 'requests') loadRequests();
  }, [activeTab, loadStudents, loadBookings, loadUnbooked, loadRequests]);

  // Classes already added to this event
  const addedClassIds = new Set(eventClasses.map(ec => ec.classId));
  // Available classes (not yet added)
  const availableClasses = ayClasses.filter(c => !addedClassIds.has(c.id));

  async function addSelectedClasses() {
    if (selectedClassIds.size === 0 || !defaults.date) return;
    await fetch('/api/event-classes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: parseInt(id),
        classIds: Array.from(selectedClassIds),
        defaults,
      }),
    });
    setSelectedClassIds(new Set());
    setShowClassPicker(false);
    loadEventClasses();
  }

  function toggleClassSelection(classId: number) {
    const next = new Set(selectedClassIds);
    if (next.has(classId)) next.delete(classId);
    else next.add(classId);
    setSelectedClassIds(next);
  }

  function selectAllAvailable() {
    setSelectedClassIds(new Set(availableClasses.map(c => c.id)));
  }

  async function removeEventClass(ecId: number) {
    if (!confirm('Remove this class from the event? This will delete its time slots and bookings.')) return;
    await fetch(`/api/event-classes/${ecId}`, { method: 'DELETE' });
    loadEventClasses();
  }

  async function saveEditEventClass(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEcId) return;
    await fetch(`/api/event-classes/${editingEcId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEcForm),
    });
    setEditingEcId(null);
    loadEventClasses();
  }

  async function generateSlots(ecId: number) {
    const res = await fetch('/api/time-slots/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventClassId: ecId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to generate slots', 'error');
      return;
    }
    showToast(`Generated ${data.count} slots (1 per student)`, 'success');
    loadEventClasses();
  }

  async function ungenerateSlots(ecId: number) {
    if (!confirm('Are you sure you want to remove all slots for this class? This cannot be undone.')) return;
    const res = await fetch(`/api/time-slots?eventClassId=${ecId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Failed to remove slots', 'error');
      return;
    }
    loadEventClasses();
  }

  async function generateAllSlots() {
    const classesWithoutSlots = eventClasses.filter(ec => ec.slotCount === 0);
    if (classesWithoutSlots.length === 0) {
      showToast('All classes already have slots generated.', 'info');
      return;
    }
    let total = 0;
    for (const ec of classesWithoutSlots) {
      const res = await fetch('/api/time-slots/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventClassId: ec.id }),
      });
      if (res.ok) {
        const data = await res.json();
        total += data.count;
      }
    }
    showToast(`Generated ${total} total slots`, 'success');
    loadEventClasses();
  }

  async function handleRequestAction(reqId: number, status: 'approved' | 'rejected', adminNotes: string) {
    await fetch(`/api/special-requests/${reqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    loadRequests();
  }

  async function handleDeleteRequest(reqId: number) {
    await fetch(`/api/special-requests/${reqId}`, { method: 'DELETE' });
    loadRequests();
  }

  async function handleSendUnbookedReminders(studentIds?: number[]) {
    const count = studentIds
      ? studentIds.length
      : unbookedForceResend
        ? unbooked.students.filter(s => s.parentEmail).length
        : unbooked.students.filter(s => s.parentEmail && !s.reminderSentAt).length;
    const label = studentIds ? `${count} selected student${count !== 1 ? 's' : ''}` : 'all unbooked students with a parent email on file';
    const forceNote = unbookedForceResend ? ' (re-sending to everyone, including already reminded)' : '';
    if (!confirm(`Send reminder emails to ${label}?${forceNote}`)) return;
    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch('/api/bookings/unbooked/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, studentIds, force: unbookedForceResend }),
      });
      setReminderResult(await res.json());
      setSelectedStudentIds(new Set());
      loadUnbooked();
    } catch {
      setReminderResult({ sent: 0, skippedNoEmail: 0, skippedAlreadySent: 0, errors: 1 });
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    setAutoAssignResult(null);
    setShowAutoAssignConfirm(false);
    try {
      const res = await fetch('/api/bookings/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: parseInt(id) }),
      });
      if (res.ok) {
        const result = await res.json();
        setAutoAssignResult(result);
        loadUnbooked();
        loadBookings();
      }
    } catch {
      setAutoAssignResult({ assigned: 0, noSlots: 0, noSlotsStudents: [], emailsSent: 0, emailsFailed: 1 });
    } finally {
      setAutoAssigning(false);
    }
  }

  if (!event) return <div className="animate-pulse">Loading...</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'classes', label: `Classes (${eventClasses.length})` },
    { key: 'students', label: 'Students' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'unbooked', label: 'Unbooked' },
    { key: 'requests', label: 'Requests' },
    { key: 'export', label: 'Export PDF' },
  ];

  return (
    <div>
      <button onClick={() => router.push('/admin/events')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Events</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{event.name}</h1>
        <button
          onClick={() => router.push(`/admin/events/${event.id}/checkin`)}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light transition-colors self-start sm:self-auto"
        >
          Check In Mode
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">Select classes from the academic year, then configure dates and times per class.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Event Classes</h2>
            <div className="flex flex-wrap gap-2">
              {eventClasses.length > 0 && (() => {
                const needSlots = eventClasses.filter(ec => ec.slotCount === 0).length;
                const allGenerated = needSlots === 0;
                return allGenerated ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    All Slots Generated
                  </span>
                ) : (
                  <button onClick={generateAllSlots} className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-light">
                    Generate Slots ({needSlots} class{needSlots !== 1 ? 'es' : ''})
                  </button>
                );
              })()}
              {availableClasses.length > 0 && (
                <button onClick={() => setShowClassPicker(!showClassPicker)} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-light">
                  {showClassPicker ? 'Cancel' : 'Add Classes'}
                </button>
              )}
            </div>
          </div>

          {/* Class Picker */}
          {showClassPicker && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Select classes to add</h3>
                <button onClick={selectAllAvailable} className="text-xs text-primary hover:underline">Select All</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
                {availableClasses.map(c => (
                  <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selectedClassIds.has(c.id) ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={selectedClassIds.has(c.id)}
                      onChange={() => toggleClassSelection(c.id)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="text-sm font-medium">{c.year} - {c.name}</span>
                      {c.teacherName && <span className="text-xs text-gray-500 block">{c.teacherName}</span>}
                    </div>
                  </label>
                ))}
              </div>

              {selectedClassIds.size > 0 && (
                <>
                  <h4 className="font-medium text-gray-700 text-sm mb-2">Default settings for selected classes ({selectedClassIds.size})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                      <input type="date" required value={defaults.date} onChange={e => setDefaults({ ...defaults, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                      <input type="time" value={defaults.startTime} onChange={e => setDefaults({ ...defaults, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Slot Duration (min)</label>
                      <input type="number" min={3} max={30} value={defaults.slotDuration} onChange={e => setDefaults({ ...defaults, slotDuration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Room (optional)</label>
                      <input type="text" value={defaults.room} onChange={e => setDefaults({ ...defaults, room: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Optional" />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                        <input type="checkbox" checked={defaults.showTeacher} onChange={e => setDefaults({ ...defaults, showTeacher: e.target.checked })}
                          className="rounded border-gray-300" />
                        Show teacher
                      </label>
                    </div>
                  </div>
                  <button onClick={addSelectedClasses} disabled={!defaults.date} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50">
                    Add {selectedClassIds.size} Classes
                  </button>
                </>
              )}

              {availableClasses.length === 0 && (
                <p className="text-sm text-gray-500">All classes from the academic year have been added.</p>
              )}
            </div>
          )}

          {/* Event classes list */}
          <div className="space-y-2">
            {eventClasses.map(ec => (
              <div key={ec.id} className="bg-white rounded-lg border border-gray-200">
                {editingEcId === ec.id ? (
                  <form onSubmit={saveEditEventClass} className="p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{ec.year} - {ec.name} {ec.teacherName && `(${ec.teacherName})`}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input type="date" required value={editEcForm.date} onChange={e => setEditEcForm({ ...editEcForm, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                        <input type="time" required value={editEcForm.startTime} onChange={e => setEditEcForm({ ...editEcForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slot Duration (min)</label>
                        <input type="number" required min={3} max={30} value={editEcForm.slotDuration} onChange={e => setEditEcForm({ ...editEcForm, slotDuration: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Room</label>
                        <input type="text" value={editEcForm.room} onChange={e => setEditEcForm({ ...editEcForm, room: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={editEcForm.showTeacher} onChange={e => setEditEcForm({ ...editEcForm, showTeacher: e.target.checked })}
                          className="rounded border-gray-300" />
                        Show teacher name to parents
                      </label>
                      <div className="ml-auto flex gap-2">
                        <button type="button" onClick={() => setEditingEcId(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-light">Save</button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900">{ec.year} - {ec.name}</h3>
                      <p className="text-sm text-gray-500 break-words">
                        {ec.teacherName && `${ec.teacherName} | `}{new Date(ec.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} | {ec.startTime} - {ec.endTime} | {ec.slotDuration}min slots
                        {ec.room && ` | Room: ${ec.room}`}
                        {!ec.showTeacher && ' | Teacher hidden'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => { setEditingEcId(ec.id); setEditEcForm({ date: ec.date, startTime: ec.startTime, slotDuration: ec.slotDuration, showTeacher: ec.showTeacher, room: ec.room }); }}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                      {ec.slotCount > 0 ? (
                        <>
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {ec.slotCount} slots
                          </span>
                          <button onClick={() => ungenerateSlots(ec.id)} className="px-3 py-1 text-xs text-amber-600 border border-amber-200 rounded hover:bg-amber-50">Remove Slots</button>
                        </>
                      ) : (
                        <button onClick={() => generateSlots(ec.id)} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Generate Slots</button>
                      )}
                      <button onClick={() => removeEventClass(ec.id)} className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {eventClasses.length === 0 && !showClassPicker && (
              <EmptyState icon="book" title="No classes added yet" description="Click 'Add Classes' above to select classes from the academic year." />
            )}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Students ({students.length})</h2>
            <p className="text-sm text-gray-500">Students are managed in the academic year. This view shows students in the selected classes.</p>
          </div>

          {/* Student list grouped by class */}
          {(() => {
            const grouped = new Map<number, { year: string; className: string; teacherName: string; students: Student[] }>();
            for (const s of students) {
              if (!grouped.has(s.classId)) {
                grouped.set(s.classId, { year: s.year, className: s.className, teacherName: s.teacherName, students: [] });
              }
              grouped.get(s.classId)!.students.push(s);
            }
            const groups = Array.from(grouped.entries()).sort((a, b) => {
              const yearCmp = a[1].year.localeCompare(b[1].year);
              return yearCmp !== 0 ? yearCmp : a[1].className.localeCompare(b[1].className);
            });

            return groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map(([classId, group]) => (
                  <div key={classId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">
                        {group.year} - {group.className}
                        <span className="ml-2 text-xs font-normal text-gray-500">({group.students.length} students)</span>
                      </h3>
                      {group.teacherName && <p className="text-xs text-gray-500">{group.teacherName}</p>}
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Student ID</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs text-gray-600">{s.studentId}</td>
                            <td className="px-4 py-2">{s.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="users" title="No students found" description="Add classes to this event first, and ensure students are imported in the academic year." />
            );
          })()}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (() => {
        const byDate = new Map<string, EventClass[]>();
        for (const ec of eventClasses) {
          const arr = byDate.get(ec.date) ?? [];
          arr.push(ec);
          byDate.set(ec.date, arr);
        }
        const days = Array.from(byDate.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, ecs]) => [
            date,
            ecs.sort((a, b) =>
              a.startTime.localeCompare(b.startTime) ||
              a.year.localeCompare(b.year) ||
              a.name.localeCompare(b.name),
            ),
          ] as const);

        return (
          <div>
            <h2 className="text-lg font-semibold mb-4">Schedule</h2>
            {days.length === 0 ? (
              <EmptyState icon="calendar" title="No classes scheduled" description="Add classes to this event from the Classes tab." />
            ) : (
              <div className="space-y-6">
                {days.map(([date, ecs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      {formatDate(date)}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        ({ecs.length} class{ecs.length !== 1 ? 'es' : ''})
                      </span>
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Class</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Teacher</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Time</th>
                              <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Room</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Slots</th>
                              <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Booked</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ecs.map(ec => {
                              const booked = bookings.filter(b =>
                                b.year === ec.year && b.className === ec.name,
                              ).length;
                              return (
                                <tr key={ec.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-medium whitespace-nowrap">{ec.year} - {ec.name}</td>
                                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{ec.teacherName || '—'}</td>
                                  <td className="px-4 py-2 whitespace-nowrap">{formatTime(ec.startTime)} – {formatTime(ec.endTime)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap">{ec.room || '—'}</td>
                                  <td className="px-4 py-2 text-right">{ec.slotCount}</td>
                                  <td className="px-4 py-2 text-right whitespace-nowrap">
                                    {ec.slotCount > 0 ? `${booked} / ${ec.slotCount}` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <BookingsTab bookings={bookings} loadBookings={loadBookings} loadUnbooked={loadUnbooked} eventId={id} />
      )}

      {/* Unbooked Tab */}
      {activeTab === 'unbooked' && (() => {
        const emailableStudents = unbooked.students.filter(s => s.parentEmail);
        const unremindedStudents = emailableStudents.filter(s => !s.reminderSentAt);
        const sendToAllCount = unbookedForceResend ? emailableStudents.length : unremindedStudents.length;
        const selectedEmailable = unbooked.students.filter(s => selectedStudentIds.has(s.id) && s.parentEmail);

        return (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">
              Unbooked Students ({unbooked.unbooked} of {unbooked.total})
            </h2>
            {unbooked.students.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={unbookedForceResend}
                    onChange={e => setUnbookedForceResend(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Force re-send
                </label>
                {selectedStudentIds.size > 0 && (
                  <button
                    onClick={() => handleSendUnbookedReminders(Array.from(selectedStudentIds))}
                    disabled={sendingReminders || selectedEmailable.length === 0}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 transition-colors"
                  >
                    {sendingReminders ? 'Sending...' : `Send to Selected (${selectedEmailable.length})`}
                  </button>
                )}
                <button
                  onClick={() => handleSendUnbookedReminders()}
                  disabled={sendingReminders || sendToAllCount === 0}
                  className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 disabled:opacity-50 transition-colors"
                >
                  {sendingReminders ? 'Sending...' : `Send to All (${sendToAllCount})`}
                </button>
                <button
                  onClick={() => setShowAutoAssignConfirm(true)}
                  disabled={autoAssigning || unbooked.unbooked === 0}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light disabled:opacity-50 transition-colors"
                >
                  {autoAssigning ? 'Assigning...' : 'Auto-Assign All'}
                </button>
              </div>
            )}
          </div>

          {/* Auto-assign confirmation dialog */}
          {showAutoAssignConfirm && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800 mb-3">
                This will automatically assign <strong>{unbooked.unbooked}</strong> unbooked students to available time slots.
                Each student will get the earliest available slot for their class. Parents with email addresses will be notified.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoAssign}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light"
                >
                  Auto-Assign {unbooked.unbooked} Students
                </button>
                <button
                  onClick={() => setShowAutoAssignConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Auto-assign result */}
          {autoAssignResult && (
            <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              {autoAssignResult.assigned > 0 && (
                <p className="text-green-700 font-medium">{autoAssignResult.assigned} student{autoAssignResult.assigned !== 1 ? 's' : ''} auto-assigned successfully.</p>
              )}
              {autoAssignResult.emailsSent > 0 && (
                <p className="text-blue-700">{autoAssignResult.emailsSent} notification email{autoAssignResult.emailsSent !== 1 ? 's' : ''} sent.</p>
              )}
              {autoAssignResult.noSlots > 0 && (
                <p className="text-amber-700">{autoAssignResult.noSlots} student{autoAssignResult.noSlots !== 1 ? 's' : ''} had no available slots: {autoAssignResult.noSlotsStudents.join(', ')}</p>
              )}
              {autoAssignResult.emailsFailed > 0 && (
                <p className="text-red-600">{autoAssignResult.emailsFailed} email{autoAssignResult.emailsFailed !== 1 ? 's' : ''} failed to send.</p>
              )}
            </div>
          )}

          {/* Result banner */}
          {reminderResult && (
            <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              {reminderResult.sent > 0 && (
                <p className="text-green-700 font-medium">Sent {reminderResult.sent} reminder{reminderResult.sent !== 1 ? 's' : ''} successfully.</p>
              )}
              {reminderResult.skippedAlreadySent > 0 && (
                <p className="text-gray-600">{reminderResult.skippedAlreadySent} student{reminderResult.skippedAlreadySent !== 1 ? 's' : ''} already reminded — skipped.</p>
              )}
              {reminderResult.skippedNoEmail > 0 && (
                <p className="text-amber-700">{reminderResult.skippedNoEmail} student{reminderResult.skippedNoEmail !== 1 ? 's have' : ' has'} no parent email on file.</p>
              )}
              {reminderResult.errors > 0 && (
                <p className="text-red-600">{reminderResult.errors} email{reminderResult.errors !== 1 ? 's' : ''} failed to send.</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={unbooked.students.length > 0 && selectedStudentIds.size === unbooked.students.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds(new Set(unbooked.students.map(s => s.id)));
                          } else {
                            setSelectedStudentIds(new Set());
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Student ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Class</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Teacher</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Parent Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Reminded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unbooked.students.map(s => (
                    <tr key={s.id} className={`hover:bg-gray-50 ${selectedStudentIds.has(s.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={(e) => {
                            const next = new Set(selectedStudentIds);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            setSelectedStudentIds(next);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.studentId}</td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3">{s.className}</td>
                      <td className="px-4 py-3">{s.teacherName}</td>
                      <td className="px-4 py-3">{s.parentEmail ? <span className="text-gray-700">{s.parentEmail}</span> : <span className="text-gray-400 italic">No email</span>}</td>
                      <td className="px-4 py-3">{s.reminderSentAt ? <span className="text-green-600 text-xs font-medium">Sent</span> : <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unbooked.students.length === 0 && (
              <EmptyState icon="check" title="All students have bookings!" description="Every student has been booked in." />
            )}
          </div>
        </div>
        );
      })()}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Special Requests ({requests.length})</h2>
          <div className="space-y-3">
            {requests.map(req => (
              <RequestCard key={req.id} request={req} onAction={handleRequestAction} onDelete={handleDeleteRequest} />
            ))}
            {requests.length === 0 && (
              <EmptyState icon="inbox" title="No special requests" description="Special arrangement requests from parents will appear here." />
            )}
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <ExportTab eventClasses={eventClasses} eventId={id} />
      )}
    </div>
  );
}

function ExportTab({ eventClasses, eventId }: { eventClasses: EventClass[]; eventId: string }) {
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  async function handleExportSingle(ecId: number, year: string, name: string) {
    setExportingId(ecId);
    try {
      const { generateSchedulePDF, downloadBlob } = await import('@/lib/pdf');
      const res = await fetch(`/api/export/teacher-schedule?eventClassId=${ecId}`);
      const data = await res.json();
      const blob = generateSchedulePDF(data);
      downloadBlob(blob, `${year}-${name}-schedule.pdf`);
    } finally {
      setExportingId(null);
    }
  }

  async function handleExportAll() {
    setExportingAll(true);
    try {
      const { generateAllSchedulesPDF, downloadBlob } = await import('@/lib/pdf');
      const schedules = await Promise.all(
        eventClasses.map(ec =>
          fetch(`/api/export/teacher-schedule?eventClassId=${ec.id}`).then(r => r.json())
        )
      );
      const blob = generateAllSchedulesPDF(schedules);
      downloadBlob(blob, 'all-schedules.pdf');
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Export Teacher Schedules (PDF)</h2>
        {eventClasses.length > 0 && (
          <button
            onClick={handleExportAll}
            disabled={exportingAll}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-light disabled:opacity-50 transition-colors"
          >
            {exportingAll ? 'Generating...' : 'Export All Classes'}
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-4">Download individual class schedules or export all at once.</p>
        <div className="space-y-2">
          {eventClasses.map(ec => (
            <div key={ec.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium">{ec.year} - {ec.name}</p>
                <p className="text-sm text-gray-500">{ec.teacherName}</p>
              </div>
              <button
                onClick={() => handleExportSingle(ec.id, ec.year, ec.name)}
                disabled={exportingId === ec.id}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
              >
                {exportingId === ec.id ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, onAction, onDelete }: { request: SpecialRequest; onAction: (id: number, status: 'approved' | 'rejected', notes: string) => void; onDelete: (id: number) => void }) {
  const [notes, setNotes] = useState(request.adminNotes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeLabels: Record<string, string> = {
    telephone_call: 'Telephone Call',
    translator: 'Translator Needed',
    other: 'Other',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{request.studentName}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              request.status === 'approved' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {request.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{request.className} | {request.parentName}</p>
        </div>
      </div>
      <div className="mt-3 text-sm">
        <p><span className="font-medium">Type:</span> {typeLabels[request.requestType] || request.requestType}</p>
        <p><span className="font-medium">Reason:</span> {request.reason}</p>
        {request.contactNumber && request.requestType === 'telephone_call' && (
          <p><span className="font-medium">Contact Number:</span> {request.contactNumber}</p>
        )}
        {request.contactNumber && request.requestType === 'translator' && (
          <p><span className="font-medium">Language:</span> {request.contactNumber}</p>
        )}
        <p><span className="font-medium">Phone:</span> {request.parentPhone}</p>
        <p><span className="font-medium">Email:</span> {request.parentEmail}</p>
      </div>
      {request.status === 'pending' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">Admin Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm mb-2"
            placeholder="Add a note..."
          />
          <div className="flex gap-2">
            <button onClick={() => onAction(request.id, 'approved', notes)} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              Approve
            </button>
            <button onClick={() => onAction(request.id, 'rejected', notes)} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              Reject
            </button>
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:underline">
            Delete Request
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">Are you sure?</span>
            <button onClick={() => onDelete(request.id)} className="text-xs text-red-600 font-medium hover:underline">Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
