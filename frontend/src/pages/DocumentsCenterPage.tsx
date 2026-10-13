import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  FileCheck2,
  Award,
  GraduationCap,
  Download,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  prn?: string;
  registration_number?: string;
  department_name?: string;
  course_name?: string;
  semester?: number;
  current_cgpa?: number;
  date_of_birth?: string;
  parent_name?: string;
}

interface CertificateItem {
  id: string;
  certificate_type: string;
  certificate_number: string;
  verification_uuid: string;
  issue_date: string;
  pdf_path?: string;
}

interface ExamFormItem {
  id: string;
  examination_name?: string;
  status: string;
  payment_status: string;
  semester_number?: number;
  academic_year?: string;
}

interface MarksheetItem {
  id: string;
  examination_name?: string;
  semester_number: number;
  academic_year: string;
  sgpa: number;
  cgpa: number;
  result_status: string;
  roll_number?: string;
}

interface ApplicationItem {
  id: string;
  application_number: string;
  application_type: string;
  purpose: string;
  status: string;
  created_at: string;
  dispatched_at?: string;
}

export const DocumentsCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [examForms, setExamForms] = useState<ExamFormItem[]>([]);
  const [marksheets, setMarksheets] = useState<MarksheetItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentDocuments();
  }, [user]);

  const loadStudentDocuments = async () => {
    try {
      setLoading(true);
      const [meRes, certRes, examRes, appRes] = await Promise.all([
        apiClient.get<StudentProfile>('/students/me').catch(() => ({ data: null })),
        apiClient.get<CertificateItem[]>('/certificates/my').catch(() => ({ data: [] })),
        apiClient.get('/examinations/').catch(() => ({ data: [] })),
        apiClient.get<ApplicationItem[]>('/applications/my').catch(() => ({ data: [] })),
      ]);

      if (meRes.data) {
        setProfile(meRes.data);
        // Load exam forms & marksheets for this student
        const [formsRes, marksRes] = await Promise.all([
          apiClient.get<ExamFormItem | null>(`/examinations/${examRes.data[0]?.id || 'latest'}/form`).catch(() => ({ data: null })),
          apiClient.get<MarksheetItem[]>(`/examinations/results/student/${meRes.data.id}`).catch(() => ({ data: [] })),
        ]);
        if (formsRes.data) {
          setExamForms([formsRes.data]);
        }
        setMarksheets(marksRes.data);
      }
      setCertificates(certRes.data);
      setApplications(appRes.data.filter((a) => a.status === 'APPROVED' || a.status === 'COMPLETED'));
    } catch (err: any) {
      console.error('Failed to load documents repository', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async (certId: string, certNum: string) => {
    try {
      const res = await apiClient.get(`/certificates/${certId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${certNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Could not download certificate PDF.');
    }
  };

  const handleDownloadHallTicket = async (formId: string) => {
    try {
      const res = await apiClient.get(`/examinations/forms/${formId}/hall-ticket-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HallTicket_${profile?.roll_number || 'Candidate'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Hall ticket not yet available. Ensure your exam form is approved and fee paid.');
    }
  };

  const handleDownloadMarksheet = async (marksheetId: string, sem: number) => {
    try {
      const res = await apiClient.get(`/examinations/results/${marksheetId}/marksheet-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Marksheet_${profile?.roll_number}_Sem${sem}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Could not download marksheet PDF.');
    }
  };

  const handleDownloadAppDocument = async (appId: string, appNum: string) => {
    try {
      const res = await apiClient.get(`/applications/${appId}/document`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${appNum}_Dispatch.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Official dispatch document not available.');
    }
  };

  return (
    <PageContainer
      title="Student Document Vault & Official Credentials"
      subtitle="Centralized institutional document center: digital student ID, verifiable certificates, exam admit cards, marksheets, and official dispatches"
    >
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs">Loading document vault...</div>
      ) : (
        <div className="space-y-6">
        {/* SECTION 1: Digital Identity Card */}
        <Card
          title="Official Student Identity Card"
          subtitle="Verifiable institutional identity credentials issued by the Registrar Office"
          action={
            <Badge variant="cyan">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Active Student
            </Badge>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Card preview visual */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#1E293B] border border-cyan-800/40 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-start border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide uppercase">CampusX Institute of Technology</h4>
                    <p className="text-[10px] text-cyan-400 font-mono">Autonomous University Institution</p>
                  </div>
                </div>
                <Badge variant="purple">ID CARD</Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 items-center">
                <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-xl bg-[#070A11] border border-slate-800 text-center">
                  <div className="w-16 h-16 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-300 font-bold text-xl mb-1.5">
                    {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : 'ST'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Candidate</span>
                </div>

                <div className="col-span-2 space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Student Name</span>
                    <p className="text-sm font-bold text-white">
                      {profile ? `${profile.first_name} ${profile.last_name}` : 'Alex Rivera'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Roll Number</span>
                      <p className="font-mono text-cyan-300 font-semibold">{profile?.roll_number || 'CS2023001'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Permanent PRN</span>
                      <p className="font-mono text-slate-300 font-medium">{profile?.prn || 'PRN-2023-CS-001'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Program</span>
                      <p className="text-slate-300 font-medium">{profile?.course_name || 'B.Tech CSE'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Valid Through</span>
                      <p className="text-emerald-400 font-mono font-medium">June 2027</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs space-y-1">
                <span className="text-slate-400">Institutional Status:</span>
                <p className="text-white font-medium">Regular Degree Enrollee</p>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  Includes NFC Campus Gate Access & Central Library Circulation privileges.
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full text-xs"
                onClick={() => window.print()}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Print / Save Digital ID
              </Button>
            </div>
          </div>
        </Card>

        {/* SECTION 2: Examination Hall Tickets */}
        <Card
          title="Examination Admit Cards & Hall Tickets"
          subtitle="Official authorization tickets for university end-semester examinations"
        >
          {examForms.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No examination registrations recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {examForms.map((f) => {
                const canDownload = f.status === 'APPROVED' && f.payment_status === 'SUCCESS';

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-bold text-white">
                          {f.examination_name || 'End Semester Examination Spring 2026'}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Semester {f.semester_number || 4} • Academic Year {f.academic_year || '2025-2026'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant={f.status === 'APPROVED' ? 'emerald' : 'cyan'}>
                          Form: {f.status}
                        </Badge>
                        <Badge variant={f.payment_status === 'SUCCESS' ? 'emerald' : 'amber'}>
                          Fee: {f.payment_status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      {canDownload ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownloadHallTicket(f.id)}
                          className="text-xs"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Download Hall Ticket PDF
                        </Button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 italic">
                          Awaiting Admin Form Approval or Fee Payment
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* SECTION 3: Official Marksheets & Transcripts */}
        <Card
          title="Semester Marksheets & Official Transcripts"
          subtitle="Grade point reports issued by the Examination Controller"
        >
          {marksheets.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No published examination results available for download.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marksheets.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white">Semester {m.semester_number} Grade Report</span>
                    <p className="text-[11px] text-slate-400 font-mono">
                      SGPA: <strong className="text-emerald-400">{m.sgpa.toFixed(2)}</strong> | CGPA:{' '}
                      <strong className="text-cyan-400">{m.cgpa.toFixed(2)}</strong>
                    </p>
                    <Badge variant="emerald" size="sm">{m.result_status}</Badge>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadMarksheet(m.id, m.semester_number)}
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* SECTION 4: Verifiable Academic Certificates */}
        <Card
          title="Verifiable Institutional Certificates"
          subtitle="Cryptographically verifiable credentials featuring university registrar seal and verification QR code"
        >
          {certificates.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No issued certificates in your institutional repository.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" />
                      <h4 className="text-xs font-bold text-white">{c.certificate_type.replace('_', ' ')}</h4>
                    </div>
                    <p className="text-[10px] font-mono text-cyan-400">{c.certificate_number}</p>
                    <p className="text-[10px] text-slate-500">Issued: {new Date(c.issue_date).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/verify/${c.verification_uuid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-300 hover:text-white"
                      title="Verify Certificate"
                    >
                      <QrCode className="w-4 h-4" />
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadCertificate(c.id, c.certificate_number)}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* SECTION 5: Official Dispatches from Application Center */}
        <Card
          title="Approved Student Requests & Official Dispatches"
          subtitle="Authorized applications with signed letters (Bonafide, NOC, Recommendation, Transcripts)"
        >
          {applications.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No approved application documents ready for dispatch.
            </div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {applications.map((app) => (
                <div key={app.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-cyan-400 font-semibold">{app.application_number}</span>
                    <p className="text-white font-medium">{app.application_type.replace(/_/g, ' ')}</p>
                    <p className="text-slate-400 text-[11px] line-clamp-1">{app.purpose}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadAppDocument(app.id, app.application_number)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Official Document
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      )}
    </PageContainer>
  );
};

export default DocumentsCenterPage;
