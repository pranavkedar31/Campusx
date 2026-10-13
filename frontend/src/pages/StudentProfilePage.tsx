import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  IdCard,
  Download,
  FileCheck2,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Award,
} from 'lucide-react';
import apiClient from '../services/api';
import { Student } from '../types';
import { Link } from 'react-router-dom';

export const StudentProfilePage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingCard, setDownloadingCard] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Student>('/students/me');
      setStudent(res.data);
    } catch (err: any) {
      console.error('Failed to load student profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadIdCard = async () => {
    if (!student) return;
    try {
      setDownloadingCard(true);
      const res = await apiClient.get(`/students/${student.id}/id-card`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CampusX_ID_Card_${student.roll_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to download ID card PDF', err);
    } finally {
      setDownloadingCard(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center py-24 text-cyan-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageContainer>
    );
  }

  if (!student) {
    return (
      <PageContainer>
        <Card className="p-12 text-center bg-[#111827]/80 border-[#1E293B]">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Student Record Not Found</h2>
          <p className="text-xs text-slate-400 mt-1">
            Please log in with a valid student identity account to view this profile.
          </p>
        </Card>
      </PageContainer>
    );
  }

  const validUntilYear = student.admission_year ? student.admission_year + 4 : 2027;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Student Identity & Academic Dossier</h1>
              <Badge variant="cyan">Official University Record</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Verified institutional credentials, digital student card, and certified documents vault.
            </p>
          </div>

          <Button variant="primary" onClick={handleDownloadIdCard} disabled={downloadingCard}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingCard ? 'Generating PDF...' : 'Download Student ID Card'}
          </Button>
        </div>

        {/* Top Profile Hero Card */}
        <Card className="p-6 bg-gradient-to-r from-cyan-950/40 via-[#111827] to-[#111827] border-cyan-800/60 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar Pill */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-cyan-950 border-2 border-cyan-400/40">
                {student.user?.full_name
                  ? student.user.full_name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                  : 'ST'}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-[#0B0F19]">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white">{student.user?.full_name || 'Alex Rivera'}</h2>
                <Badge variant="emerald">Enrolled & Active</Badge>
                <span className="text-xs font-mono text-cyan-400 px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-800">
                  {student.roll_number}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {student.course?.name || 'Bachelor of Technology'} • Department of{' '}
                {student.department?.name || 'Computer Science & Engineering'}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  {student.user?.email || 'student@campusx.edu'}
                </span>
                {student.user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {student.user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Admission Batch: {student.admission_year}
                </span>
              </div>
            </div>

            {/* Key Standings */}
            <div className="flex md:flex-col gap-3 shrink-0">
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-center min-w-[100px]">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Cumulative CGPA</p>
                <p className="text-lg font-bold text-cyan-400">{student.cgpa?.toFixed(2) || '8.85'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-center min-w-[100px]">
                <p className="text-[10px] text-slate-500 uppercase font-mono">Attendance Standing</p>
                <p className="text-lg font-bold text-emerald-400">{student.attendance_pct?.toFixed(1) || '91.5'}%</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Two Column Grid: Digital ID Card Preview & Academic Standing Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Digital Student Identity Card Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Digital Student ID Card</h3>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B0F19] border border-cyan-800/80 shadow-2xl relative overflow-hidden">
              {/* Watermark accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-[#334155]/60 pb-3">
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-white uppercase">CampusX University</h4>
                  <p className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase">Student Identity Card</p>
                </div>
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Card Body */}
              <div className="flex items-center gap-4 py-4">
                <div className="w-16 h-20 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-300 font-mono text-lg font-bold shrink-0">
                  {student.user?.full_name ? student.user.full_name[0] : 'S'}
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-sm font-bold text-white">{student.user?.full_name}</p>
                  <p className="text-[11px] text-cyan-300 font-mono">Roll No: {student.roll_number}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Enrollment: {student.enrollment_number}</p>
                  <p className="text-[11px] text-slate-300">
                    {student.course?.name || 'B.Tech CSE'} • Sem {student.current_semester} (Sec {student.section})
                  </p>
                  <p className="text-[10px] text-emerald-400 font-semibold pt-1">
                    Valid Upto: June {validUntilYear}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#334155]/60 text-[10px] text-slate-400">
                <span className="font-mono">DEPT: {student.department?.code || 'CSE'}</span>
                <span className="font-mono text-cyan-400">INSTITUTIONAL QR SEALED</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="secondary" onClick={handleDownloadIdCard} disabled={downloadingCard}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Printable ID PDF
              </Button>
            </div>
          </div>

          {/* Academic Profile Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registration & Curricular Info</h3>
            </div>

            <Card className="p-5 bg-[#111827]/90 border-[#1E293B] space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Roll Number</p>
                  <p className="text-white font-mono font-semibold mt-0.5">{student.roll_number}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Enrollment ID</p>
                  <p className="text-white font-mono font-semibold mt-0.5">{student.enrollment_number}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Department</p>
                  <p className="text-white font-semibold mt-0.5">{student.department?.name || 'Computer Science'}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Degree Program</p>
                  <p className="text-white font-semibold mt-0.5">{student.course?.name || 'B.Tech'}</p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Current Semester</p>
                  <p className="text-white font-semibold mt-0.5">
                    Semester {student.current_semester} (Section {student.section})
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 font-medium">Admission Academic Year</p>
                  <p className="text-white font-semibold mt-0.5">{student.admission_year}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                <span className="text-slate-400">Institutional Email:</span>
                <span className="text-cyan-300 font-mono">{student.user?.email}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Digital Document Vault */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Digital Documents Vault</h3>
            </div>
            <Link to="/certificates" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <span>View All Certificates</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-[#111827]/80 border-[#1E293B] hover:border-cyan-800/60 transition flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <Badge variant="cyan">Official Sealed</Badge>
                </div>
                <h4 className="text-sm font-bold text-white">Bonafide Certificate</h4>
                <p className="text-xs text-slate-400">
                  Proof of active enrollment for passport, visa, educational loans, and bus pass applications.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E293B] mt-3">
                <Link to="/certificates">
                  <Button variant="outline" className="w-full">
                    Open in Certificate Hub
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B] hover:border-cyan-800/60 transition flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-950 border border-purple-800 text-purple-300">
                    <Award className="w-4 h-4" />
                  </div>
                  <Badge variant="purple">Certified Result</Badge>
                </div>
                <h4 className="text-sm font-bold text-white">Semester Marksheets</h4>
                <p className="text-xs text-slate-400">
                  Consolidated university grade transcripts with SGPA, CGPA, and subject credits.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E293B] mt-3">
                <Link to="/examinations">
                  <Button variant="outline" className="w-full">
                    View & Download Marksheet
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B] hover:border-cyan-800/60 transition flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <Badge variant="emerald">Financial Ledger</Badge>
                </div>
                <h4 className="text-sm font-bold text-white">Fee Payment Receipts</h4>
                <p className="text-xs text-slate-400">
                  Official digitized bursar receipts with transaction reference and breakdown.
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E293B] mt-3">
                <Link to="/fees">
                  <Button variant="outline" className="w-full">
                    Open Fee Portal
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
