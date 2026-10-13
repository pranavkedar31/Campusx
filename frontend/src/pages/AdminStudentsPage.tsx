import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import {
  UserPlus,
  KeyRound,
  FileSpreadsheet,
  Search,
  Eye,
} from 'lucide-react';

interface Student {
  id: string;
  roll_number: string;
  enrollment_number: string;
  prn?: string;
  registration_number?: string;
  current_semester: number;
  section: string;
  admission_year: number;
  cgpa: number;
  attendance_pct: number;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  department?: {
    id: string;
    code: string;
    name: string;
  };
  course?: {
    id: string;
    name: string;
  };
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  department_id: string;
}

export const AdminStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Add Student Form State
  const [addForm, setAddForm] = useState({
    full_name: '',
    email: '',
    password: 'Password@123',
    phone: '',
    roll_number: '',
    enrollment_number: '',
    prn: '',
    department_id: '',
    course_id: '',
    current_semester: 1,
    section: 'A',
    admission_year: 2026,
    parent_name: '',
    parent_phone: '',
    date_of_birth: '2004-01-01',
    gender: 'Male',
    address: '',
  });

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState('');

  // Bulk CSV text
  const [csvText, setCsvText] = useState('');

  useEffect(() => {
    fetchMetadata();
    fetchStudents();
  }, [deptFilter]);

  const fetchMetadata = async () => {
    try {
      const [deptRes, courseRes] = await Promise.all([
        apiClient.get<Department[]>('/academics/departments'),
        apiClient.get<Course[]>('/academics/courses'),
      ]);
      setDepartments(deptRes.data);
      setCourses(courseRes.data);
      if (deptRes.data.length > 0 && !addForm.department_id) {
        setAddForm((prev) => ({
          ...prev,
          department_id: deptRes.data[0].id,
          course_id: courseRes.data[0]?.id || '',
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const url = deptFilter ? `/students/?department_id=${deptFilter}` : '/students/';
      const res = await apiClient.get<Student[]>(url);
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/students/', addForm);
      setShowAddModal(false);
      setAddForm({
        full_name: '',
        email: '',
        password: 'Password@123',
        phone: '',
        roll_number: '',
        enrollment_number: '',
        prn: '',
        department_id: departments[0]?.id || '',
        course_id: courses[0]?.id || '',
        current_semester: 1,
        section: 'A',
        admission_year: 2026,
        parent_name: '',
        parent_phone: '',
        date_of_birth: '2004-01-01',
        gender: 'Male',
        address: '',
      });
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create student account.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newPassword) return;

    try {
      await apiClient.post(`/students/${selectedStudent.id}/reset-password`, {
        new_password: newPassword,
      });
      setShowResetModal(false);
      setNewPassword('');
      alert(`Password successfully updated for ${selectedStudent.roll_number}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) return;
    try {
      // Parse CSV lines: email,password,full_name,roll_number,enrollment_number,prn
      const lines = csvText.trim().split('\n');
      const payload = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          email: parts[0],
          password: parts[1] || 'Password@123',
          full_name: parts[2] || 'Student',
          roll_number: parts[3],
          enrollment_number: parts[4] || parts[3],
          prn: parts[5] || `PRN-${parts[3]}`,
          department_id: departments[0]?.id || '',
          course_id: courses[0]?.id || '',
          current_semester: 1,
          section: 'A',
          admission_year: 2026,
        };
      });

      const res = await apiClient.post('/students/bulk-import', payload);
      alert(`Bulk Import Finished: ${res.data.imported_count} accounts imported successfully.`);
      setShowBulkModal(false);
      setCsvText('');
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Bulk import failed.');
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.roll_number.toLowerCase().includes(q) ||
      s.enrollment_number.toLowerCase().includes(q) ||
      (s.prn && s.prn.toLowerCase().includes(q)) ||
      (s.user?.full_name && s.user.full_name.toLowerCase().includes(q)) ||
      (s.user?.email && s.user.email.toLowerCase().includes(q))
    );
  });

  return (
    <PageContainer
      title="Institutional Student Registry"
      subtitle="Manage student admissions, PRN identifiers, security credential resets, and bulk import."
      action={
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowBulkModal(true)} variant="secondary" size="sm">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Bulk CSV Import
          </Button>
          <Button onClick={() => setShowAddModal(true)} variant="primary" size="sm">
            <UserPlus className="w-4 h-4 mr-1.5" /> Register Student
          </Button>
        </div>
      }
    >
      <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by PRN, roll number, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#111C35] border border-[#1E2E4F] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Academic Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Table */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No student records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E293B] text-slate-400">
                  <th className="py-3 px-3">Roll & PRN</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Department & Program</th>
                  <th className="py-3 px-3">Sem & Sec</th>
                  <th className="py-3 px-3">CGPA</th>
                  <th className="py-3 px-3">Attendance</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-[#111C35]/50 transition">
                    <td className="py-3 px-3">
                      <p className="font-mono font-bold text-cyan-400">{s.roll_number}</p>
                      <p className="text-[10px] text-slate-400 font-mono">PRN: {s.prn || 'N/A'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">{s.user?.full_name}</p>
                      <p className="text-[11px] text-slate-400">{s.user?.email}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-300 font-medium">{s.department?.code}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{s.course?.name}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      Sem {s.current_semester} - {s.section}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {s.cgpa.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className={s.attendance_pct < 75 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {s.attendance_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <Button
                        onClick={() => navigate(`/students/${s.id}`)}
                        variant="secondary"
                        size="sm"
                        className="text-xs py-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedStudent(s);
                          setShowResetModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-xs py-1 border-amber-800 text-amber-400 hover:bg-amber-950/40"
                        title="Reset Student Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" /> Register New Student Identity
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">University Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2026042"
                  value={addForm.roll_number}
                  onChange={(e) => setAddForm({ ...addForm, roll_number: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Permanent Reg Number (PRN)</label>
                <input
                  type="text"
                  placeholder="e.g. PRN-2026-CS-042"
                  value={addForm.prn}
                  onChange={(e) => setAddForm({ ...addForm, prn: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Enrollment Number</label>
                <input
                  type="text"
                  required
                  value={addForm.enrollment_number}
                  onChange={(e) => setAddForm({ ...addForm, enrollment_number: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={addForm.department_id}
                  onChange={(e) => setAddForm({ ...addForm, department_id: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Program</label>
                <select
                  value={addForm.course_id}
                  onChange={(e) => setAddForm({ ...addForm, course_id: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={addForm.parent_name}
                  onChange={(e) => setAddForm({ ...addForm, parent_name: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Contact Number</label>
                <input
                  type="text"
                  value={addForm.parent_phone}
                  onChange={(e) => setAddForm({ ...addForm, parent_phone: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Register Student Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Reset Student Password
            </h3>
            <p className="text-xs text-slate-400">
              Set new authentication credentials for student <b>{selectedStudent.roll_number}</b> ({selectedStudent.user?.full_name}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Min 6 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setShowResetModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-500">
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" /> Bulk Student Import (CSV)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste comma-separated rows in format:<br/>
              <code className="text-cyan-400 bg-slate-900 px-2 py-0.5 rounded font-mono text-[11px]">email,password,full_name,roll_number,enrollment_number,prn</code>
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="s1@campusx.edu,Pass@123,Jane Doe,CS2026101,EN2026101,PRN-2026-101&#10;s2@campusx.edu,Pass@123,John Smith,CS2026102,EN2026102,PRN-2026-102"
              className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-3 text-xs text-slate-200 font-mono"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <Button onClick={() => setShowBulkModal(false)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button onClick={handleBulkImport} variant="primary" size="sm">
                Process CSV Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
export default AdminStudentsPage;
