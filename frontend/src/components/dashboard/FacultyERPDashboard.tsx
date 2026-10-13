import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  FileCheck2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Upload,
  TrendingUp,
  FileText,
} from 'lucide-react';
import apiClient from '../../services/api';
import { FacultyERPDashboardData } from '../../types';
import { Card } from '../common/Card';

export const FacultyERPDashboard: React.FC = () => {
  const [data, setData] = useState<FacultyERPDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFacultyDashboard();
  }, []);

  const fetchFacultyDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<FacultyERPDashboardData>('/dashboard/faculty-erp');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load Faculty ERP dashboard data', err);
      setError('Unable to load faculty operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-sm">Aggregating Faculty Academic Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl border border-red-800/40 bg-red-950/20 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'No faculty profile detected.'}</p>
        <button
          onClick={fetchFacultyDashboard}
          className="px-4 py-2 bg-red-800/40 text-red-200 rounded-xl text-xs font-semibold hover:bg-red-800/60 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP ROW: Faculty Key Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Enrolled Students */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Student Load</p>
            <h3 className="text-2xl font-bold text-white mt-1">{data.total_students} Students</h3>
            <p className="text-xs text-slate-400 mt-1">Across assigned course sections</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Teaching Courses */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Assigned Courses</p>
            <h3 className="text-2xl font-bold text-white mt-1">{data.assigned_subjects.length} Courses</h3>
            <p className="text-xs text-slate-400 mt-1">Dept: <span className="font-mono text-cyan-400 font-medium">{data.department_code}</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/50 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Assignments Pending Evaluation */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Pending Grading</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{data.assignments_pending_evaluation} Submissions</h3>
            <p className="text-xs text-slate-400 mt-1">Requires evaluation & feedback</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/50 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* 4. At-Risk Early Warning Alerts */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Early Warning At-Risk</p>
            <h3 className="text-2xl font-bold text-red-400 mt-1">{data.at_risk_students_count} Students</h3>
            <p className="text-xs text-slate-400 mt-1">Attendance &lt; 75% or CGPA &lt; 6.0</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-950/50 border border-red-800/60 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="p-4 rounded-2xl border border-[#1E293B] bg-[#111827]/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Instructor Quick Actions:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            to="/attendance"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" /> Mark Class Attendance
          </Link>
          <Link
            to="/assignments"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Create Assignment
          </Link>
          <Link
            to="/learning-material"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Study Material
          </Link>
          <Link
            to="/performance"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Enter CIA Marks
          </Link>
          <Link
            to="/risk-analysis"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Student Risk Sandbox
          </Link>
        </div>
      </div>

      {/* MIDDLE ROW: Today's Teaching Schedule & Assigned Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Teaching Timetable */}
        <Card
          title="Today's Teaching Schedule"
          subtitle="Assigned lectures and lab practicals for today"
          action={
            <Link to="/timetable" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data.today_classes.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No teaching slots scheduled for today.</div>
          ) : (
            <div className="space-y-3">
              {data.today_classes.map((cls, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-cyan-400 px-2 py-1 rounded bg-[#111827]">
                      {cls.start_time} - {cls.end_time}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{cls.subject_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{cls.subject_code}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
                    Room {cls.room}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Assigned Courses Roster */}
        <Card title="Assigned Teaching Courses" subtitle="Class sections and current enrolled rosters">
          <div className="space-y-3">
            {data.assigned_subjects.map((sub) => (
              <div key={sub.subject_id} className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-cyan-400 font-semibold">{sub.subject_code}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#111827] text-slate-400">Sec {sub.section}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 mt-0.5">{sub.subject_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-400">{sub.students_count}</span>
                  <p className="text-[10px] text-slate-400">Enrolled Students</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* LOWER ROW: Submissions Awaiting Evaluation & Upcoming Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <Card
          title="Recent Student Submissions"
          subtitle="Coursework ready for review and grading"
          action={
            <Link to="/assignments" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Grade In Assignments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data.recent_submissions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No pending student submissions.</div>
          ) : (
            <div className="space-y-2.5">
              {data.recent_submissions.map((sub) => (
                <div key={sub.id} className="p-3 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">{sub.student_name} <span className="text-[11px] font-mono text-cyan-400">({sub.roll_number})</span></p>
                    <p className="text-[11px] text-slate-400">{sub.assignment_title} • Submitted {sub.submitted_at}</p>
                  </div>
                  <Link
                    to="/assignments"
                    className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition text-[11px] font-semibold"
                  >
                    Grade Now
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Department Exams */}
        <Card
          title="Upcoming Department Exams"
          subtitle="Examination duties and subject test dates"
          action={
            <Link to="/examinations" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Full Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data.upcoming_exams.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No department exams scheduled.</div>
          ) : (
            <div className="space-y-2.5">
              {data.upcoming_exams.map((ex, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">{ex.subject_name} <span className="font-mono text-cyan-400">({ex.subject_code})</span></p>
                    <p className="text-[11px] text-slate-400">{ex.exam_date} at {ex.start_time}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-300 bg-[#111827] px-2 py-1 rounded">
                    Room {ex.room_no}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
