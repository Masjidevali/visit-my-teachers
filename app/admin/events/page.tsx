'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { showToast } from '@/app/components/Toast';
import { EmptyState } from '@/app/components/EmptyState';

interface Event {
  id: number;
  name: string;
  isActive: boolean;
  academicYearName: string;
}

interface AcademicYear {
  id: number;
  name: string;
  isActive: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeAy, setActiveAy] = useState<AcademicYear | null>(null);

  useEffect(() => {
    loadEvents();
    loadActiveAy();
  }, []);

  async function loadEvents() {
    const res = await fetch('/api/events');
    setEvents(await res.json());
  }

  async function loadActiveAy() {
    const res = await fetch('/api/academic-years');
    const years: AcademicYear[] = await res.json();
    setActiveAy(years.find(y => y.isActive) || null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAy) return;
    setSaving(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, academicYearId: activeAy.id }),
    });
    if (res.ok) {
      setShowForm(false);
      setName('');
      loadEvents();
    }
    setSaving(false);
  }

  async function toggleActive(event: Event) {
    await fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !event.isActive }),
    });
    loadEvents();
  }

  async function deleteEvent(id: number) {
    if (!confirm('Delete this event and all its data? This cannot be undone.')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    loadEvents();
  }

  async function duplicateEvent(event: Event) {
    const name = prompt('Name for the new event:', `${event.name} (Copy)`);
    if (!name) return;
    const res = await fetch('/api/events/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceEventId: event.id, name }),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`Event duplicated with ${data.classCount} classes`, 'success');
      loadEvents();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Create Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {!activeAy ? (
            <div className="text-amber-700 bg-amber-50 rounded-lg p-4 text-sm">
              No active academic year. Please <Link href="/admin/academic-years" className="underline font-medium">create and activate an academic year</Link> before creating events.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">This event will use classes and students from: <span className="font-medium text-gray-900">{activeAy.name}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Visit-My-Teachers 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-4 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Event'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{event.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {event.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{event.academicYearName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleActive(event)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {event.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <Link
                  href={`/admin/events/${event.id}`}
                  className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-light"
                >
                  Manage
                </Link>
                <button
                  onClick={() => duplicateEvent(event)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && !showForm && (
          <EmptyState icon="calendar" title="No events created yet" description="Create your first Visit-My-Teachers event to get started." />
        )}
      </div>
    </div>
  );
}
