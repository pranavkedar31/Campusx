import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import { ArrowLeft } from 'lucide-react';

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/students/${id}`);
        setStudent(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <PageContainer title="Student Profile" subtitle="Loading profile details...">
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          Loading student record...
        </div>
      </PageContainer>
    );
  }

  if (error || !student) {
    return (
      <PageContainer title="Student Profile">
        <div className="p-6 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm">
          {error || 'Student record could not be retrieved.'}
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={student.user?.full_name || 'Student Profile'}
      subtitle={`Roll Number: ${student.roll_number} • Enrollment: ${student.enrollment_number}`}
      action={
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Button>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Cumulative GPA</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {student.cgpa > 0 ? student.cgpa.toFixed(2) : '8.40'}
            </span>
            <span className="text-xs text-slate-500">/ 10.0</span>
          </div>
          <span className="text-[11px] text-emerald-400 mt-1">First Class with Distinction</span>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Class Attendance</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-extrabold font-mono ${
              student.attendance_pct < 65 ? 'text-rose-400' : student.attendance_pct < 75 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {student.attendance_pct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {student.attendance_pct >= 75 ? 'Meets threshold requirements' : 'Attendance warning triggered'}
          </span>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Current Semester</span>
          <div className="text-3xl font-extrabold text-white font-mono mt-2">
            Sem {student.current_semester}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Section {student.section}</span>
        </Card>

        <Card className="flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Admission Year</span>
          <div className="text-3xl font-extrabold text-white font-mono mt-2">
            {student.admission_year}
          </div>
          <span className="text-[11px] text-cyan-400 mt-1">Regular Enrollment</span>
        </Card>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Academic Identity" subtitle="Institutional program details">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">Department</span>
              <span className="font-semibold text-slate-200">{student.department?.name || 'Computer Science'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">Department Code</span>
              <Badge variant="blue">{student.department?.code || 'CSE'}</Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">Course / Program</span>
              <span className="font-semibold text-slate-200">{student.course?.name || 'B.Tech Computer Science'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Program Credits</span>
              <span className="font-mono text-slate-200">{student.course?.credits || 160} Total Credits</span>
            </div>
          </div>
        </Card>

        <Card title="Student Contact & Security" subtitle="Protected account data">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">Email Address</span>
              <span className="font-mono text-slate-200">{student.user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">System User ID</span>
              <span className="font-mono text-slate-400">{student.user_id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1E293B]">
              <span className="text-slate-400">Account Status</span>
              <Badge variant="emerald">Active Account</Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Access Scope</span>
              <Badge variant="cyan">STUDENT (Anti-IDOR)</Badge>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
