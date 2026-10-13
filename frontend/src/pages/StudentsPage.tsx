import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import apiClient from '../services/api';
import { Search, Eye } from 'lucide-react';

interface Student {
  id: string;
  roll_number: string;
  enrollment_number: string;
  department_id: string;
  course_id: string;
  current_semester: number;
  section: string;
  admission_year: number;
  cgpa: number;
  attendance_pct: number;
  user?: {
    full_name: string;
    email: string;
  };
  department?: {
    name: string;
    code: string;
  };
}

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const navigate = useNavigate();

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (semesterFilter) params.current_semester = semesterFilter;
      const res = await apiClient.get<Student[]>('/students/', { params });
      setStudents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [semesterFilter]);

  return (
    <PageContainer
      title="Student Directory & Academic Records"
      subtitle="Complete enrolled student roster, academic standing, and attendance tracking"
      action={
        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="md">
            {students.length} Enrolled Students
          </Badge>
        </div>
      }
    >
      <Card>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by roll number, name, or enrollment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <Button variant="secondary" onClick={fetchStudents} className="flex items-center gap-1.5">
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0F172A] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
              <tr>
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">CGPA</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] bg-[#111827]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono">
                    Loading student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No student records match the search query.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-[#0F172A]/50 transition">
                    <td className="px-4 py-3.5 font-mono font-medium text-cyan-400">
                      {s.roll_number}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white">
                      {s.user?.full_name || 'Student Name'}
                      <div className="text-[11px] text-slate-500 font-mono">{s.enrollment_number}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="blue">{s.department?.code || 'CSE'}</Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      Sem {s.current_semester} - Sec {s.section}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-200">
                      {s.cgpa > 0 ? s.cgpa.toFixed(2) : 'N/A'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-mono font-semibold ${
                        s.attendance_pct < 65 ? 'text-rose-400' : s.attendance_pct < 75 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {s.attendance_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/students/${s.id}`)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-700 text-slate-300 hover:text-cyan-400 transition"
                        title="View Student Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
};
