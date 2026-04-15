'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Event {
  id: number;
  name: string;
  date: string;
  isActive: boolean;
}

interface Stats {
  totalStudents: number;
  totalBookings: number;
  totalClasses: number;
  unbookedStudents: number;
  pendingRequests: number;
}

interface DailyBooking {
  date: string;
  count: number;
}

interface ClassStat {
  className: string;
  year: string;
  totalStudents: number;
  bookedStudents: number;
}

interface RecentBooking {
  id: number;
  bookingRef: string;
  studentName: string;
  className: string;
  year: string;
  parentName: string;
  createdAt: string;
  startTime: string;
}

interface DetailedStats {
  bookingsPerDay: DailyBooking[];
  classStats: ClassStat[];
  recentBookings: RecentBooking[];
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then(data => {
      setEvents(data);
      const active = data.find((e: Event) => e.isActive);
      if (active) setSelectedEvent(active.id);
      setLoading(false);
    });
  }, []);

  const loadDetailedStats = useCallback(async (eventId: number) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/stats?eventId=${eventId}`);
      if (res.ok) {
        setDetailedStats(await res.json());
        setLastRefreshed(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    fetch(`/api/dashboard?eventId=${selectedEvent}`)
      .then(r => r.json())
      .then(setStats);
    loadDetailedStats(selectedEvent);
  }, [selectedEvent, loadDetailedStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!selectedEvent) return;
    const interval = setInterval(() => loadDetailedStats(selectedEvent), 30000);
    return () => clearInterval(interval);
  }, [selectedEvent, loadDetailedStats]);

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">
              {refreshing ? 'Refreshing...' : `Updated ${timeAgo(lastRefreshed.toISOString().slice(0, -1))}`}
            </span>
          )}
          {selectedEvent && (
            <button
              onClick={() => loadDetailedStats(selectedEvent)}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Refresh
            </button>
          )}
          {events.length > 0 && (
            <select
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} {ev.isActive ? '(Active)' : ''}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-500 mb-4">Create your first Visit-My-Teachers event to get started.</p>
          <Link
            href="/admin/events"
            className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-light transition-colors"
          >
            Create Event
          </Link>
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStudents}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Booked</p>
              <p className="text-3xl font-bold text-accent mt-1">{stats.totalBookings}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Unbooked</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.unbookedStudents}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Special Requests</p>
              <p className="text-3xl font-bold text-primary mt-1">{stats.pendingRequests}</p>
            </div>
          </div>

          {detailedStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bookings Per Day Chart */}
              {detailedStats.bookingsPerDay.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings Per Day</h3>
                  <div className="space-y-2">
                    {(() => {
                      const max = Math.max(...detailedStats.bookingsPerDay.map(d => d.count));
                      return detailedStats.bookingsPerDay.map(d => (
                        <div key={d.date} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20 shrink-0">
                            {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          <div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden">
                            <div
                              className="h-full bg-primary/80 rounded transition-all"
                              style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-8 text-right">{d.count}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Per-Class Fill Rate */}
              {detailedStats.classStats.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Class Fill Rate</h3>
                  <div className="space-y-3">
                    {detailedStats.classStats
                      .sort((a, b) => {
                        const pctA = a.totalStudents > 0 ? a.bookedStudents / a.totalStudents : 0;
                        const pctB = b.totalStudents > 0 ? b.bookedStudents / b.totalStudents : 0;
                        return pctB - pctA;
                      })
                      .map(cs => {
                        const pct = cs.totalStudents > 0 ? Math.round((cs.bookedStudents / cs.totalStudents) * 100) : 0;
                        const barColor = pct >= 75 ? 'bg-accent' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        return (
                          <div key={`${cs.year}-${cs.className}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-700 font-medium">{cs.year} - {cs.className}</span>
                              <span className="text-xs text-gray-500">{cs.bookedStudents}/{cs.totalStudents} ({pct}%)</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Bookings Feed */}
          {detailedStats && detailedStats.recentBookings.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Bookings</h3>
              <div className="space-y-3">
                {detailedStats.recentBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{b.studentName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{b.studentName}</p>
                        <p className="text-xs text-gray-500">{b.year} - {b.className} &middot; {b.parentName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-primary">{b.bookingRef}</p>
                      <p className="text-xs text-gray-400">{timeAgo(b.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/admin/events/${selectedEvent}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary transition-colors">
              <h3 className="font-semibold text-gray-900">Manage Event</h3>
              <p className="text-sm text-gray-500 mt-1">Classes, slots, students, bookings</p>
            </Link>
            <Link href={`/admin/events/${selectedEvent}?tab=unbooked`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary transition-colors">
              <h3 className="font-semibold text-gray-900">Unbooked Students</h3>
              <p className="text-sm text-gray-500 mt-1">{stats.unbookedStudents} students without bookings</p>
            </Link>
            <Link href={`/admin/events/${selectedEvent}?tab=requests`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary transition-colors">
              <h3 className="font-semibold text-gray-900">Special Requests</h3>
              <p className="text-sm text-gray-500 mt-1">{stats.pendingRequests} pending requests</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
