import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { CalendarCheck2, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

interface SubjectAttendance {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  total_classes: number;
  attended_classes: number;
  attendance_pct: number;
  status: string;
}

interface OverallSummary {
  student_id: string;
  total_classes: number;
  attended_classes: number;
  overall_percentage: number;
  status: string;
  subject_breakdown: SubjectAttendance[];
}

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [lowAttendanceList, setLowAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Faculty Mark Attendance State
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>({});

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACULTY';

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'STUDENT') {
        const meRes = await apiClient.get('/students/me');
        const stuId = meRes.data.id;
        const attRes = await apiClient.get<OverallSummary>(`/attendance/student/${stuId}`);
        setSummary(attRes.data);
      } else {
        const [lowRes, subsRes, stusRes] = await Promise.all([
          apiClient.get('/attendance/low-attendance'),
          apiClient.get('/academics/subjects'),
          apiClient.get('/students/'),
        ]);
        setLowAttendanceList(lowRes.data);
        setSubjects(subsRes.data);
        setStudents(stusRes.data);
        if (subsRes.data.length > 0) setSelectedSubject(subsRes.data[0].id);

        const initialStatuses: Record<string, string> = {};
        stusRes.data.forEach((s: any) => {
          initialStatuses[s.id] = 'Present';
        });
        setStudentStatuses(initialStatuses);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    const records = Object.entries(studentStatuses).map(([stuId, status]) => ({
      student_id: stuId,
      status,
    }));

    try {
      await apiClient.post('/attendance/bulk', {
        subject_id: selectedSubject,
        date: selectedDate,
        records,
      });
      setShowMarkModal(false);
      fetchData();
      alert('Attendance recorded successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit attendance.');
    }
  };

  return (
    <PageContainer
      title="Attendance Tracking & Intelligence"
      subtitle="Configurable warning (75%) and critical (65%) threshold monitoring"
      action={
        isStaff && (
          <Button size="sm" onClick={() => setShowMarkModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Mark Class Attendance
          </Button>
        )
      }
    >
      {/* Student View */}
      {!isStaff && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Overall Attendance" subtitle="Institutional threshold: 75%">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold font-mono ${
                  summary.overall_percentage < 65 ? 'text-rose-400' : summary.overall_percentage < 75 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {summary.overall_percentage.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-500">cumulative</span>
              </div>
              <div className="mt-3">
                <Badge variant={summary.status === 'Critical' ? 'rose' : summary.status === 'Warning' ? 'amber' : 'emerald'}>
                  {summary.status} Standing
                </Badge>
              </div>
            </Card>

            <Card title="Classes Attended" subtitle="Actual lecture presence">
              <div className="text-4xl font-extrabold text-white font-mono">
                {summary.attended_classes} <span className="text-slate-500 text-lg">/ {summary.total_classes}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Classes recorded to date</p>
            </Card>

            <Card title="Threshold Compliance" subtitle="Automated warning rule">
              {summary.overall_percentage < 75 ? (
                <div className="flex items-start gap-2.5 text-amber-400 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    Attendance is currently below the 75% examination eligibility threshold. Immediate attendance improvement required.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>Eligible for all midterm and semester examinations.</span>
                </div>
              )}
            </Card>
          </div>

          <Card title="Subject-wise Attendance Breakdown" subtitle="Detailed course lecture stats">
            <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0F172A] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Attended / Total</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B] bg-[#111827]">
                  {summary.subject_breakdown.map((sub) => (
                    <tr key={sub.subject_id} className="hover:bg-[#0F172A]/50 transition">
                      <td className="px-4 py-3.5 font-medium text-white">
                        {sub.subject_name}
                        <div className="text-[11px] text-slate-500 font-mono">{sub.subject_code}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {sub.attended_classes} / {sub.total_classes}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-100">
                        {sub.attendance_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 w-48">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sub.attendance_pct < 65 ? 'bg-rose-500' : sub.attendance_pct < 75 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(sub.attendance_pct, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Badge variant={sub.status === 'Critical' ? 'rose' : sub.status === 'Warning' ? 'amber' : 'emerald'}>
                          {sub.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Staff / Faculty View */}
      {isStaff && (
        <div className="space-y-6">
          <Card title="Early Warning Alerts — Low Attendance" subtitle="Students falling below 75% or 65% critical threshold">
            <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0F172A] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="px-4 py-3">Roll Number</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Semester</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3 text-right">Severity Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B] bg-[#111827]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-mono">
                        Scanning attendance records...
                      </td>
                    </tr>
                  ) : lowAttendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-emerald-400">
                        All students currently satisfy the 75% attendance threshold.
                      </td>
                    </tr>
                  ) : (
                    lowAttendanceList.map((stu) => (
                      <tr key={stu.id} className="hover:bg-[#0F172A]/50 transition">
                        <td className="px-4 py-3.5 font-mono text-cyan-400 font-medium">{stu.roll_number}</td>
                        <td className="px-4 py-3.5 font-medium text-white">{stu.full_name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">Sem {stu.current_semester}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-rose-400">{stu.attendance_pct.toFixed(1)}%</td>
                        <td className="px-4 py-3.5 text-right">
                          <Badge variant={stu.is_critical ? 'rose' : 'amber'}>
                            {stu.is_critical ? 'Critical (<65%)' : 'Warning (<75%)'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Mark Attendance Modal */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-cyan-400" /> Mark Class Attendance
              </h3>
              <button onClick={() => setShowMarkModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Teaching Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Session Date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="border border-[#1E293B] rounded-xl max-h-60 overflow-y-auto divide-y divide-[#1E293B]">
                {students.map((stu) => (
                  <div key={stu.id} className="p-3 flex items-center justify-between text-xs bg-[#0F172A]/40">
                    <div>
                      <span className="font-semibold text-white">{stu.user?.full_name || stu.roll_number}</span>
                      <span className="text-slate-500 font-mono ml-2">({stu.roll_number})</span>
                    </div>
                    <div className="flex gap-1.5">
                      {['Present', 'Absent', 'Late', 'Excused'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStudentStatuses({ ...studentStatuses, [stu.id]: st })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            studentStatuses[stu.id] === st
                              ? st === 'Present'
                                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                                : st === 'Absent'
                                ? 'bg-rose-950 border border-rose-500 text-rose-300'
                                : 'bg-amber-950 border border-amber-500 text-amber-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowMarkModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Attendance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
