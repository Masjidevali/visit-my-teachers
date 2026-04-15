'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AcademicYear {
  id: number;
  name: string;
  isActive: boolean;
}

interface Class {
  id: number;
  year: string;
  name: string;
  teacherName: string;
}

interface Student {
  id: number;
  studentId: string;
  name: string;
  classId: number;
  className: string;
  classYear: string;
}

type Tab = 'classes' | 'students';

export default function AcademicYearDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('classes');
  const [ay, setAy] = useState<AcademicYear | null>(null);

  // Classes state
  const [classes, setClasses] = useState<Class[]>([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ year: '', name: '', teacherName: '' });
  const [editingClass, setEditingClass] = useState<number | null>(null);
  const [editClassForm, setEditClassForm] = useState({ year: '', name: '', teacherName: '' });
  const [showClassImport, setShowClassImport] = useState(false);
  const [classCsvText, setClassCsvText] = useState('');
  const [classImportResult, setClassImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [classImporting, setClassImporting] = useState(false);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentImport, setShowStudentImport] = useState(false);
  const [studentCsvText, setStudentCsvText] = useState('');
  const [studentImportResult, setStudentImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [studentImporting, setStudentImporting] = useState(false);

  const loadAy = useCallback(async () => {
    const res = await fetch(`/api/academic-years/${id}`);
    if (!res.ok) { router.push('/admin/academic-years'); return; }
    setAy(await res.json());
  }, [id, router]);

  const loadClasses = useCallback(async () => {
    const res = await fetch(`/api/academic-years/${id}/classes`);
    setClasses(await res.json());
  }, [id]);

  const loadStudents = useCallback(async () => {
    const res = await fetch(`/api/academic-years/${id}/students`);
    setStudents(await res.json());
  }, [id]);

  useEffect(() => {
    loadAy();
    loadClasses();
    loadStudents();
  }, [loadAy, loadClasses, loadStudents]);

  // Class CRUD
  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/academic-years/${id}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classForm),
    });
    if (res.ok) {
      setShowClassForm(false);
      setClassForm({ year: '', name: '', teacherName: '' });
      loadClasses();
    }
  }

  async function handleUpdateClass(classId: number) {
    await fetch(`/api/classes/${classId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editClassForm),
    });
    setEditingClass(null);
    loadClasses();
  }

  async function handleDeleteClass(classId: number) {
    if (!confirm('Delete this class and all its students?')) return;
    await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
    loadClasses();
    loadStudents();
  }

  async function handleClassImport() {
    setClassImporting(true);
    try {
      const lines = classCsvText.trim().split('\n').filter(l => l.trim());
      const rows = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { year: parts[0], name: parts[1], teacherName: parts[2] || '' };
      });

      const res = await fetch(`/api/academic-years/${id}/classes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const result = await res.json();
      setClassImportResult(result);
      if (result.imported > 0) loadClasses();
    } finally {
      setClassImporting(false);
    }
  }

  async function handleStudentImport() {
    setStudentImporting(true);
    try {
      const lines = studentCsvText.trim().split('\n').filter(l => l.trim());
      const rows = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { studentId: parts[0], name: parts[1], className: parts[2], parentEmail: parts[3] || undefined, ccEmails: parts[4] || undefined };
      });

      const res = await fetch(`/api/academic-years/${id}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const result = await res.json();
      setStudentImportResult(result);
      if (result.imported > 0) loadStudents();
    } finally {
      setStudentImporting(false);
    }
  }

  async function handleDeleteStudent(studentId: number) {
    if (!confirm('Delete this student?')) return;
    await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
    loadStudents();
  }

  if (!ay) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'classes', label: `Classes (${classes.length})` },
    { key: 'students', label: `Students (${students.length})` },
  ];

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push('/admin/academic-years')} className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">&larr; Back to Academic Years</button>
        <h1 className="text-2xl font-bold text-gray-900">{ay.name}</h1>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ay.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {ay.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Classes Tab */}
      {tab === 'classes' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setShowClassForm(!showClassForm); setShowClassImport(false); }}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light"
            >
              {showClassForm ? 'Cancel' : 'Add Class'}
            </button>
            <button
              onClick={() => { setShowClassImport(!showClassImport); setShowClassForm(false); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              {showClassImport ? 'Cancel' : 'Import CSV'}
            </button>
          </div>

          {showClassForm && (
            <form onSubmit={handleAddClass} className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="text" required value={classForm.year} onChange={e => setClassForm({ ...classForm, year: e.target.value })}
                    placeholder="e.g. Year 3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                  <input type="text" required value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                    placeholder="e.g. 3A" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Name</label>
                  <input type="text" value={classForm.teacherName} onChange={e => setClassForm({ ...classForm, teacherName: e.target.value })}
                    placeholder="e.g. Br Ahmed" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light">Add Class</button>
            </form>
          )}

          {showClassImport && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <p className="text-sm text-gray-600 mb-2">Upload a CSV file or paste data below. Format: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">year, name, teacherName</code></p>
              <label className="flex items-center gap-2 mb-3 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-sm text-gray-600">Upload CSV file</span>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setClassCsvText(ev.target?.result as string || '');
                    reader.readAsText(file);
                  }
                  e.target.value = '';
                }} />
              </label>
              <textarea
                value={classCsvText}
                onChange={e => setClassCsvText(e.target.value)}
                rows={6}
                placeholder={"Year 3, 3A, Br Ahmed\nYear 3, 3B, Sr Fatima\nYear 4, 4A, Br Yusuf"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
              <button onClick={handleClassImport} disabled={!classCsvText.trim() || classImporting} className="mt-3 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 inline-flex items-center gap-2">
                {classImporting && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {classImporting ? 'Importing...' : 'Import Classes'}
              </button>
              {classImportResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium text-green-700">{classImportResult.imported} classes imported</p>
                  {classImportResult.errors.map((err, i) => <p key={i} className="text-red-600 mt-1">{err}</p>)}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {classes.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                {editingClass === c.id ? (
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year</label>
                      <input type="text" value={editClassForm.year} onChange={e => setEditClassForm({ ...editClassForm, year: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm w-24" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input type="text" value={editClassForm.name} onChange={e => setEditClassForm({ ...editClassForm, name: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm w-24" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Teacher</label>
                      <input type="text" value={editClassForm.teacherName} onChange={e => setEditClassForm({ ...editClassForm, teacherName: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm w-36" />
                    </div>
                    <button onClick={() => handleUpdateClass(c.id)} className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg">Save</button>
                    <button onClick={() => setEditingClass(null)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{c.year} - {c.name}</span>
                      {c.teacherName && <span className="text-gray-500 ml-2">({c.teacherName})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingClass(c.id); setEditClassForm({ year: c.year, name: c.name, teacherName: c.teacherName || '' }); }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteClass(c.id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {classes.length === 0 && <p className="text-gray-500 text-center py-8">No classes added yet.</p>}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowStudentImport(!showStudentImport)}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light"
            >
              {showStudentImport ? 'Cancel' : 'Import Students CSV'}
            </button>
            {students.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm(`Delete all ${students.length} students in this academic year? This cannot be undone.`)) return;
                  await fetch(`/api/academic-years/${id}/students`, { method: 'DELETE' });
                  loadStudents();
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Delete All Students
              </button>
            )}
          </div>

          {showStudentImport && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <p className="text-sm text-gray-600 mb-2">Upload a CSV file or paste data below. Format: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">studentId, name, className, parentEmail, ccEmails (last two optional)</code></p>
              <p className="text-xs text-gray-500 mb-2">Class name should match &quot;Year - ClassName&quot; (e.g. &quot;Year 3 - 3A&quot;) or just &quot;ClassName&quot; (e.g. &quot;3A&quot;)</p>
              <label className="flex items-center gap-2 mb-3 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-sm text-gray-600">Upload CSV file</span>
                <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setStudentCsvText(ev.target?.result as string || '');
                    reader.readAsText(file);
                  }
                  e.target.value = '';
                }} />
              </label>
              <textarea
                value={studentCsvText}
                onChange={e => setStudentCsvText(e.target.value)}
                rows={6}
                placeholder={"MV-001, Ahmed Khan, 3A, ahmed@email.com, spouse@email.com\nMV-002, Fatima Ali, 3B, fatima@email.com\nMV-003, Yusuf Hassan, 4A"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
              <button onClick={handleStudentImport} disabled={!studentCsvText.trim() || studentImporting} className="mt-3 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-light disabled:opacity-50 inline-flex items-center gap-2">
                {studentImporting && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {studentImporting ? 'Importing...' : 'Import Students'}
              </button>
              {studentImportResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium text-green-700">{studentImportResult.imported} students imported</p>
                  {studentImportResult.errors.map((err, i) => <p key={i} className="text-red-600 mt-1">{err}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Group students by class */}
          {classes.map(c => {
            const classStudents = students.filter(s => s.classId === c.id);
            if (classStudents.length === 0) return null;
            return (
              <div key={c.id} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{c.year} - {c.name} {c.teacherName && `(${c.teacherName})`} <span className="text-gray-400 font-normal">({classStudents.length} students)</span></h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Student ID</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(s => (
                        <tr key={s.id} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 font-mono text-gray-600">{s.studentId}</td>
                          <td className="px-4 py-2 text-gray-900">{s.name}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteStudent(s.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {students.length === 0 && <p className="text-gray-500 text-center py-8">No students imported yet. Import classes first, then import students.</p>}
        </div>
      )}
    </div>
  );
}
