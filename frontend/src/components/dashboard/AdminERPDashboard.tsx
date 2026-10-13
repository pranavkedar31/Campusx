import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Receipt,
  CalendarCheck2,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  FileText,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import apiClient from '../../services/api';
import { AdminERPDashboardData } from '../../types';
import { Card } from '../common/Card';

export const AdminERPDashboard: React.FC = () => {
  const [data, setData] = useState<AdminERPDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<AdminERPDashboardData>('/dashboard/admin-erp');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load Admin ERP dashboard', err);
      setError('Unable to load institutional command metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-mono text-sm">Loading Institutional Command Center...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl border border-red-800/40 bg-red-950/20 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-red-300 font-medium">{error || 'Data retrieval error.'}</p>
        <button
          onClick={fetchAdminDashboard}
          className="px-4 py-2 bg-red-800/40 text-red-200 rounded-xl text-xs font-semibold hover:bg-red-800/60 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP ROW: University Enterprise KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Student Census */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Student Census</p>
            <h3 className="text-2xl font-bold text-white mt-1">{data.total_students} Enrolled</h3>
            <p className="text-xs text-slate-400 mt-1">Faculty: <span className="font-semibold text-cyan-400">{data.total_faculty}</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Fee Collection Rate */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Fee Collection</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹ {data.fees_collected.toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-1">Recovery Rate: <span className="font-mono text-emerald-300 font-semibold">{data.collection_rate_pct}%</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Campus Attendance Average */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Average Attendance</p>
            <h3 className="text-2xl font-bold text-white mt-1">{data.average_attendance_pct}%</h3>
            <p className="text-xs text-amber-400 mt-1">{data.low_attendance_students_count} Students &lt; 75%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/50 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Active Placement Drives */}
        <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">Career Placements</p>
            <h3 className="text-2xl font-bold text-white mt-1">{data.active_placement_drives_count} Active Drives</h3>
            <p className="text-xs text-slate-400 mt-1">Certificates Pending: <span className="text-amber-400 font-semibold">{data.pending_certificates_count}</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* QUICK OPERATIONS BAR */}
      <div className="p-4 rounded-2xl border border-[#1E293B] bg-[#111827]/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">ERP Administrative Modules:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            to="/fees"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" /> Fees & Ledger
          </Link>
          <Link
            to="/examinations"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Exam Verification
          </Link>
          <Link
            to="/reports"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Institutional Reports
          </Link>
          <Link
            to="/users"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" /> User Directory
          </Link>
          <Link
            to="/audit-logs"
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-cyan-950 hover:border-cyan-800 border border-transparent text-slate-300 hover:text-cyan-300 font-medium transition flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Security Audit
          </Link>
        </div>
      </div>

      {/* MIDDLE ROW: Department Distribution & Financial Ledger Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Enrollment */}
        <Card title="Departmental Distribution" subtitle="Active student body across degree programs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(data.department_distribution).map(([dept, count]) => (
              <div key={dept} className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0B0F19] text-center space-y-1">
                <span className="font-mono text-xs text-cyan-400 font-bold">{dept}</span>
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Students</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Financial Overview */}
        <Card
          title="Institutional Fee Ledger"
          subtitle="Collected vs outstanding receivables"
          action={
            <Link to="/fees" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              Ledger Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                <p className="text-[10px] text-slate-400 uppercase">Collected</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">₹ {data.fees_collected.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                <p className="text-[10px] text-slate-400 uppercase">Pending</p>
                <p className="text-sm font-bold text-amber-400 mt-0.5">₹ {data.fees_pending.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                <p className="text-[10px] text-slate-400 uppercase">Overdue</p>
                <p className="text-sm font-bold text-red-400 mt-0.5">₹ {data.fees_overdue.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Fee Collection Progress</span>
                <span className="font-mono text-emerald-400 font-bold">{data.collection_rate_pct}%</span>
              </div>
              <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.collection_rate_pct)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* LOWER ROW: Exam & Academic Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#1E293B] bg-[#111827] space-y-1">
          <p className="text-[11px] text-slate-400">Examination Sessions</p>
          <h4 className="text-xl font-bold text-white">{data.upcoming_exams_count} Upcoming</h4>
          <p className="text-[11px] text-cyan-400">{data.pending_exam_forms_count} Forms Pending Verification</p>
        </div>

        <div className="p-4 rounded-xl border border-[#1E293B] bg-[#111827] space-y-1">
          <p className="text-[11px] text-slate-400">Coursework Assignments</p>
          <h4 className="text-xl font-bold text-white">{data.total_assignments_count} Published</h4>
          <p className="text-[11px] text-amber-400">{data.pending_evaluations_count} Pending Grading</p>
        </div>

        <div className="p-4 rounded-xl border border-[#1E293B] bg-[#111827] space-y-1">
          <p className="text-[11px] text-slate-400">Digital Certificates</p>
          <h4 className="text-xl font-bold text-white">{data.pending_certificates_count} Requests</h4>
          <p className="text-[11px] text-slate-400">Awaiting Signature & QR</p>
        </div>

        <div className="p-4 rounded-xl border border-[#1E293B] bg-[#111827] space-y-1">
          <p className="text-[11px] text-slate-400">Campus Compliance</p>
          <h4 className="text-xl font-bold text-emerald-400">{data.average_attendance_pct}% Avg</h4>
          <p className="text-[11px] text-slate-400">Regular Semester Active</p>
        </div>
      </div>
    </div>
  );
};
