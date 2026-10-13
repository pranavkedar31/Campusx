import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CalendarCheck2,
  Receipt,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../../services/api';
import { StudentERPDashboardData } from '../../types';
import { Card } from '../common/Card';

export const StudentERPDashboard: React.FC = () => {
  const [data, setData] = useState<StudentERPDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<StudentERPDashboardData>('/dashboard/student-erp');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load Student ERP dashboard data', err);
      setError('Unable to load real-time ERP metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-sm">Aggregating Institutional ERP Metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl border border-red-800/40 bg-red-950/20 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'No student profile detected.'}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-800/40 text-red-200 rounded-xl text-xs font-semibold hover:bg-red-800/60 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { academic_summary, attendance_summary, fees_summary } = data;

  return (
    <div className="space-y-6">
      {/* Attendance Warnings Banner if any */}
      {attendance_summary.alerts && attendance_summary.alerts.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-800/40 bg-amber-950/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-amber-300">Attendance Attention Required</p>
            {attendance_summary.alerts.map((alert, idx) => (
              <p key={idx} className="text-amber-200/80">{alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* TOP ROW: 4 Critical ERP KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Academic Position */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Academic Standing</p>
            <h3 className="text-2xl font-bold text-white mt-1">Semester {academic_summary.current_semester}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sec {academic_summary.section} • Roll: <span className="font-mono text-cyan-400 font-medium">{academic_summary.roll_number}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* 2. CGPA & SGPA */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Cumulative CGPA</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{academic_summary.cgpa.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ 10.0</span></h3>
            <p className="text-xs text-slate-400 mt-1">
              Recent SGPA: <span className="font-mono text-emerald-300">{academic_summary.sgpa.toFixed(2)}</span> • {academic_summary.percentage}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Overall Attendance */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Attendance Record</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-white">{attendance_summary.overall_percentage}%</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                attendance_summary.status === 'GOOD' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                attendance_summary.status === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {attendance_summary.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {attendance_summary.present_count} Present / {attendance_summary.total_lectures} Total Sessions
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/50 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Fees Outstanding */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Fee Obligation</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {fees_summary.pending_amount > 0 ? `₹ ${fees_summary.pending_amount.toLocaleString()}` : 'Cleared'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {fees_summary.pending_amount > 0 ? (
                <>Due: <span className="text-amber-400 font-mono">{fees_summary.next_due_date || 'Within 30 Days'}</span></>
              ) : (
                <span className="text-emerald-400">All Semesters Settled</span>
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="p-4 rounded-2xl border border-[#1E293B] bg-[#111827]/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Quick ERP Actions:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            to="/assignments"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Submit Assignment
          </Link>
          <Link
            to="/examinations"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> Exam Hall Ticket & Form
          </Link>
          <Link
            to="/fees"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" /> View Fee Ledger
          </Link>
          <Link
            to="/timetable"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" /> Full Timetable
          </Link>
          <Link
            to="/certificates"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Request Bonafide
          </Link>
        </div>
      </div>

      {/* MIDDLE ROW: Attendance Trend Graph & Subject-wise Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Monthly Attendance Trend"
            subtitle="Historical session engagement across the current academic term"
            action={
              <Link to="/attendance" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                Full Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendance_summary.monthly_trend}>
                  <defs>
                    <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[60, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8, fontSize: 12 }}
                    formatter={(val: any) => [`${val}%`, 'Attendance']}
                  />
                  <Area type="monotone" dataKey="percentage" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#attGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Subject-wise Attendance Grid */}
          <Card title="Subject-wise Attendance Breakdown" subtitle="Mandatory minimum 75% for exam eligibility">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendance_summary.subject_cards.map((sub) => (
                <div key={sub.subject_id} className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-cyan-400 font-semibold">{sub.subject_code}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      sub.status === 'GOOD' ? 'bg-emerald-950 text-emerald-300' :
                      sub.status === 'WARNING' ? 'bg-amber-950 text-amber-300' :
                      'bg-red-950 text-red-300'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium truncate">{sub.subject_name}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{sub.attended_classes} of {sub.total_classes} lectures</span>
                      <span className="font-semibold text-slate-200">{sub.attendance_pct}%</span>
                    </div>
                    <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sub.attendance_pct >= 75 ? 'bg-emerald-400' :
                          sub.attendance_pct >= 65 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.min(100, sub.attendance_pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Today's Classes & Upcoming Exams */}
        <div className="space-y-4">
          {/* Today's Schedule */}
          <Card
            title="Today's Classes"
            subtitle="Scheduled lectures and lab sessions"
            action={
              <Link to="/timetable" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                Weekly <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {data.today_classes.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">No scheduled lectures for today.</div>
            ) : (
              <div className="space-y-3">
                {data.today_classes.map((cls, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-start gap-3">
                    <div className="px-2 py-1 rounded bg-[#111827] text-cyan-400 font-mono text-[11px] font-semibold text-center shrink-0">
                      {cls.start_time}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-slate-200 truncate">{cls.subject_name}</p>
                      <p className="text-slate-400 text-[11px] truncate">{cls.faculty_name} • <span className="font-mono text-cyan-300">{cls.room}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Exams */}
          <Card
            title="Upcoming Examinations"
            subtitle="Next scheduled test sessions"
            action={
              <Link to="/examinations" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {data.upcoming_exams.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">No examination schedules published yet.</div>
            ) : (
              <div className="space-y-3">
                {data.upcoming_exams.slice(0, 3).map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 text-[11px] font-semibold">{ex.subject_code}</span>
                      <span className="text-[11px] text-slate-400">{ex.exam_date}</span>
                    </div>
                    <p className="font-medium text-slate-200 truncate">{ex.subject_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ex.start_time} - {ex.end_time} • Room: <span className="font-mono text-cyan-300">{ex.room_no}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* LOWER ROW: Pending Assignments, Recent Results, Notices & Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Assignments */}
        <Card
          title="Pending Assignments"
          subtitle="Awaiting submission"
          action={
            <Link to="/assignments" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {data.pending_assignments.length === 0 ? (
            <div className="py-6 text-center text-emerald-400 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> All coursework submitted!
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.pending_assignments.map((ass) => (
                <div key={ass.id} className="p-2.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-1 text-xs">
                  <p className="font-medium text-slate-200 truncate">{ass.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-cyan-400">{ass.subject_code}</span>
                    <span>Due: {ass.due_date.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Results */}
        <Card
          title="Academic Results"
          subtitle="Semester Grade Transcripts"
          action={
            <Link to="/examinations" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {data.recent_results.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">No published semester transcripts yet.</div>
          ) : (
            <div className="space-y-2.5">
              {data.recent_results.map((res) => (
                <div key={res.id} className="p-2.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">Semester {res.semester_number}</p>
                    <p className="text-[11px] text-slate-400">SGPA: <span className="font-mono text-emerald-400 font-semibold">{res.sgpa.toFixed(2)}</span></p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {res.result_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Institutional Notices */}
        <Card
          title="Campus Notices"
          subtitle="Recent announcements"
          action={
            <Link to="/notices" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {data.recent_notices.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">No active bulletin notices.</div>
          ) : (
            <div className="space-y-2.5">
              {data.recent_notices.map((n) => (
                <div key={n.id} className="p-2.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#111827] text-slate-400">{n.category}</span>
                    <span className="text-[10px] text-slate-500">{n.publish_date}</span>
                  </div>
                  <p className="font-medium text-slate-200 truncate">{n.title}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Campus Events */}
        <Card
          title="Campus Events"
          subtitle="Conferences & activities"
          action={
            <Link to="/notices" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {data.upcoming_events.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">No upcoming campus events.</div>
          ) : (
            <div className="space-y-2.5">
              {data.upcoming_events.map((ev) => (
                <div key={ev.id} className="p-2.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-1 text-xs">
                  <p className="font-medium text-slate-200 truncate">{ev.title}</p>
                  <p className="text-[11px] text-slate-400">{ev.venue}</p>
                  <p className="text-[10px] font-mono text-cyan-400">{ev.event_date}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
