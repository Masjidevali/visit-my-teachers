'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AcademicYear {
  id: number;
  name: string;
  isActive: boolean;
}

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadYears();
  }, []);

  async function loadYears() {
    const res = await fetch('/api/academic-years');
    setYears(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/academic-years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setShowForm(false);
      setName('');
      loadYears();
    }
    setSaving(false);
  }

  async function toggleActive(year: AcademicYear) {
    await fetch(`/api/academic-years/${year.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !year.isActive }),
    });
    loadYears();
  }

  async function deleteYear(id: number) {
    if (!confirm('Delete this academic year and all its classes/students? This cannot be undone.')) return;
    await fetch(`/api/academic-years/${id}`, { method: 'DELETE' });
    loadYears();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          {showForm ? 'Cancel' : 'New Academic Year'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2025/2026"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {years.map(year => (
          <div key={year.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{year.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${year.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {year.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggleActive(year)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {year.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <Link
                href={`/admin/academic-years/${year.id}`}
                className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-light"
              >
                Manage
              </Link>
              <button
                onClick={() => deleteYear(year.id)}
                className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Delete
              </button>
            </div>
            </div>
          </div>
        ))}

        {years.length === 0 && !showForm && (
          <p className="text-gray-500 text-center py-8">No academic years created yet.</p>
        )}
      </div>
    </div>
  );
}
