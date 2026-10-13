import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Calendar,
  FileText,
  Award,
  CheckCircle2,
  Download,
  X,
  FileCheck,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';
import apiClient from '../services/api';
import { Examination, ExamForm, ExamResult } from '../types';

interface ExtendedExamForm extends ExamForm {
  payment_status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  payment_reference?: string;
  amount_paid?: number;
  paid_at?: string;
}

export const ExaminationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isAdminOrFaculty = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACULTY';

  const [activeTab, setActiveTab] = useState<'schedules' | 'forms' | 'results'>('schedules');
  const [exams, setExams] = useState<Examination[]>([]);
  const [examForm, setExamForm] = useState<ExtendedExamForm | null>(null);
  const [pendingForms, setPendingForms] = useState<ExtendedExamForm[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Registration form state for student
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [registering, setRegistering] = useState<boolean>(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NET_BANKING' | 'DEBIT_CARD'>('UPI');
  const [payingFee, setPayingFee] = useState<boolean>(false);

  useEffect(() => {
    loadExaminationsData();
  }, [user]);

  const loadExaminationsData = async () => {
    try {
      setLoading(true);
      const examsRes = await apiClient.get<Examination[]>('/examinations/');
      setExams(examsRes.data);

      if (examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0].id);
      }

      if (isStudent) {
        if (examsRes.data.length > 0) {
          const firstExam = examsRes.data[0];
          const formRes = await apiClient
            .get<ExtendedExamForm | null>(`/examinations/${firstExam.id}/form`)
            .catch(() => ({ data: null }));
          setExamForm(formRes.data);
        }

        // Fetch subjects for registration
        const subRes = await apiClient.get('/academics/subjects').catch(() => ({ data: [] }));
        setAvailableSubjects(subRes.data);
        if (subRes.data.length > 0) {
          setSelectedSubjectIds(subRes.data.slice(0, 5).map((s: any) => s.id));
        }

        // Get Student ID from me
        const meRes = await apiClient.get('/students/me').catch(() => ({ data: null }));
        if (meRes.data) {
          const resList = await apiClient.get<ExamResult[]>(`/examinations/results/student/${meRes.data.id}`);
          setResults(resList.data);
        }
      } else if (isAdminOrFaculty) {
        const pFormsRes = await apiClient.get<ExtendedExamForm[]>('/examinations/forms/pending').catch(() => ({ data: [] }));
        setPendingForms(pFormsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load examination data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExam = async () => {
    if (!selectedExamId || selectedSubjectIds.length === 0) {
      setMessage({ text: 'Please select an active examination and at least one subject.', type: 'error' });
      return;
    }

    try {
      setRegistering(true);
      await apiClient.post(`/examinations/${selectedExamId}/form`, {
        subject_ids: selectedSubjectIds,
      });

      setMessage({
        text: 'Exam Form registered successfully! Please proceed to pay the examination fee.',
        type: 'success',
      });
      loadExaminationsData();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to submit exam registration.',
        type: 'error',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handlePayFee = async () => {
    if (!examForm) return;

    try {
      setPayingFee(true);
      await apiClient.post(`/examinations/forms/${examForm.id}/pay-fee`, {
        amount: 1500,
        payment_method: paymentMethod,
      });

      setMessage({
        text: 'Examination fee paid successfully! Payment status updated to SUCCESS. (Awaiting final administrative verification for hall ticket issuance).',
        type: 'success',
      });
      setIsPaymentModalOpen(false);
      loadExaminationsData();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Payment transaction failed.',
        type: 'error',
      });
    } finally {
      setPayingFee(false);
    }
  };

  const handleDownloadHallTicket = async (formId: string) => {
    try {
      const res = await apiClient.get(`/examinations/forms/${formId}/hall-ticket-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HallTicket_${examForm?.roll_number || 'Student'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setMessage({
        text: 'Hall ticket generation locked. Ensure form is APPROVED by admin, fee is PAID, and timetable is scheduled.',
        type: 'error',
      });
    }
  };

  const handleReviewForm = async (formId: string, statusVal: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/examinations/forms/${formId}/review`, {
        status: statusVal,
        verification_notes:
          statusVal === 'APPROVED'
            ? 'Verified by Examination Cell. Prerequisites satisfied.'
            : 'Eligibility criteria not met.',
      });
      setMessage({ text: `Exam form marked as ${statusVal}!`, type: 'success' });
      loadExaminationsData();
    } catch (err: any) {
      setMessage({ text: 'Review action failed.', type: 'error' });
    }
  };

  const handleDownloadMarksheet = async (resultId: string, rollNo: string, sem: number) => {
    try {
      const res = await apiClient.get(`/examinations/results/${resultId}/marksheet-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Marksheet_${rollNo}_Sem${sem}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download marksheet PDF', err);
    }
  };

  return (
    <PageContainer
      title="Examination & Academic Results Cell"
      subtitle="Timetables, student examination registration forms, fee settlements, verification, and official transcripts"
      action={
        isAdminOrFaculty ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/admin/examinations/timetable')}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> Exam Timetable Manager
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate('/admin/examinations/forms')}>
              <FileCheck className="w-3.5 h-3.5 mr-1" /> Review All Forms
            </Button>
          </div>
        ) : undefined
      }
    >
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/40 text-red-300 border border-red-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#1E293B] gap-2">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'schedules'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Examination Schedules ({exams.length})
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'forms'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isStudent ? 'Exam Registration & Hall Ticket' : `Pending Form Verifications (${pendingForms.length})`}
        </button>

        {isStudent && (
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'results'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" /> Results & Marksheets ({results.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs">Loading examination records...</div>
      ) : activeTab === 'schedules' ? (
        /* TAB 1: Schedules */
        <div className="space-y-6">
          {exams.map((ex) => (
            <Card
              key={ex.id}
              title={ex.name}
              subtitle={`${ex.academic_year} • Semester ${ex.semester_number} • ${ex.start_date} to ${ex.end_date}`}
              action={
                <Badge
                  variant={
                    ex.status === 'UPCOMING'
                      ? 'cyan'
                      : ex.status === 'RESULTS_PUBLISHED'
                      ? 'emerald'
                      : 'purple'
                  }
                >
                  {ex.status.replace('_', ' ')}
                </Badge>
              }
            >
              {ex.instructions && (
                <p className="text-xs text-slate-400 mb-4 p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                  <b>Instructions:</b> {ex.instructions}
                </p>
              )}

              {ex.schedules && ex.schedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Course Title</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Time Window</th>
                        <th className="py-2.5 px-3">Venue / Hall</th>
                        <th className="py-2.5 px-3 text-right">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {ex.schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-[#111827]/40 transition">
                          <td className="py-2.5 px-3 font-mono text-cyan-400 font-medium">{s.subject_code}</td>
                          <td className="py-2.5 px-3 text-slate-200 font-medium">{s.subject_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{s.exam_date}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {s.start_time} - {s.end_time}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{s.room_no}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-slate-200">{s.max_marks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-500 text-xs">
                  No subject schedules attached to this session yet.
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : activeTab === 'forms' ? (
        /* TAB 2: Exam Forms */
        <div className="space-y-6">
          {isStudent ? (
            examForm ? (
              <Card
                title={`Exam Form Status: ${examForm.examination_name || 'Semester Exam'}`}
                subtitle={`Registered for Semester Examination • Submitted ${new Date(
                  examForm.submission_date
                ).toLocaleDateString()}`}
                action={
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        examForm.payment_status === 'SUCCESS'
                          ? 'emerald'
                          : examForm.payment_status === 'PENDING'
                          ? 'amber'
                          : 'rose'
                      }
                    >
                      Fee: {examForm.payment_status || 'PENDING'}
                    </Badge>
                    <Badge
                      variant={
                        examForm.status === 'APPROVED'
                          ? 'emerald'
                          : examForm.status === 'SUBMITTED'
                          ? 'cyan'
                          : 'amber'
                      }
                    >
                      Form: {examForm.status}
                    </Badge>
                  </div>
                }
              >
                <div className="space-y-4">
                  {/* Status Grid */}
                  <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Student Roll Number:</span>
                      <span className="font-mono text-cyan-400 font-bold">{examForm.roll_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fee Status:</span>
                      <span
                        className={
                          examForm.payment_status === 'SUCCESS'
                            ? 'text-emerald-400 font-bold'
                            : 'text-amber-400 font-semibold'
                        }
                      >
                        {examForm.payment_status === 'SUCCESS'
                          ? `Paid ₹${examForm.amount_paid || 1500} (${examForm.payment_reference || 'Ref Verified'})`
                          : 'Pending Settlement (₹1,500)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verification Remarks:</span>
                      <span className="text-slate-200">
                        {examForm.verification_notes || 'Under review by Examination Cell'}
                      </span>
                    </div>
                  </div>

                  {/* Fee Payment Section if Pending */}
                  {examForm.payment_status !== 'SUCCESS' && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-amber-300">
                        <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <p className="font-semibold">Examination Fee Payment Required (₹1,500)</p>
                          <p className="text-[11px] text-slate-400">
                            Payment alone does not issue the hall ticket; administrative verification is also required.
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setIsPaymentModalOpen(true)}>
                        Pay Exam Fee (₹1,500)
                      </Button>
                    </div>
                  )}

                  {/* Registered Subjects */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                      Registered Examination Subjects
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {examForm.subjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl border border-[#1E293B] bg-[#0B0F19] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono text-cyan-400 font-semibold">{sub.subject_code}</span>
                            <p className="text-slate-200 font-medium">{sub.subject_name}</p>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Regular
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hall Ticket Availability Guard Banner */}
                  {examForm.status === 'APPROVED' && examForm.payment_status === 'SUCCESS' ? (
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>Exam Form Verified & Fee Paid. Hall Ticket Ready for download.</span>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handleDownloadHallTicket(examForm.id)}
                        className="text-xs py-1.5 px-3"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Download Admit Card PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-slate-400 flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-300">Hall Ticket Issuance Locked</p>
                        <p className="text-[11px] text-slate-400">
                          Hall ticket download is strictly guarded by the Examination Cell and will be activated once
                          both conditions are met:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                          <li>
                            Form Status:{' '}
                            <strong className={examForm.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}>
                              {examForm.status}
                            </strong>{' '}
                            (Required: APPROVED)
                          </li>
                          <li>
                            Payment Status:{' '}
                            <strong
                              className={
                                examForm.payment_status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'
                              }
                            >
                              {examForm.payment_status || 'PENDING'}
                            </strong>{' '}
                            (Required: SUCCESS)
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              /* Registration Form for Student if no form exists */
              <Card
                title="Register for Semester End Examinations"
                subtitle="Select active examination session and enrolled curriculum subjects"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Examination Session</label>
                      <select
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                      >
                        {exams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name} ({ex.academic_year} • Sem {ex.semester_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Standard Exam Fee</label>
                      <div className="px-3 py-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-xs font-mono text-cyan-400 font-bold">
                        ₹1,500 (Payable after form submission)
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Choose Subjects for Examination Enrollment
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {availableSubjects.map((sub) => {
                        const isSelected = selectedSubjectIds.includes(sub.id);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== sub.id));
                              } else {
                                setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-700 text-white'
                                : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <span className="font-mono text-cyan-400 font-semibold">{sub.code}</span>
                              <p className="font-medium text-slate-200">{sub.name}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button onClick={handleRegisterExam} disabled={registering}>
                      {registering ? 'Submitting Registration...' : 'Submit Examination Form'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          ) : (
            /* ADMIN VIEW: Pending Exam Forms */
            <Card
              title="Pending Examination Form Verifications"
              subtitle="Approve student exam applications to authorize hall ticket issuance"
            >
              {pendingForms.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">No pending exam forms awaiting review.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Roll Number</th>
                        <th className="py-3 px-4">Examination</th>
                        <th className="py-3 px-4">Fee Status</th>
                        <th className="py-3 px-4">Form Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {pendingForms.map((f) => (
                        <tr key={f.id} className="hover:bg-[#111827]/40 transition">
                          <td className="py-3 px-4 font-semibold text-white">{f.student_name}</td>
                          <td className="py-3 px-4 font-mono text-cyan-400">{f.roll_number}</td>
                          <td className="py-3 px-4 text-slate-300">{f.examination_name}</td>
                          <td className="py-3 px-4">
                            <Badge variant={f.payment_status === 'SUCCESS' ? 'emerald' : 'amber'}>
                              {f.payment_status || 'PENDING'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="cyan">{f.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              variant="secondary"
                              onClick={() => handleReviewForm(f.id, 'APPROVED')}
                              className="text-xs py-1 px-2.5 text-emerald-400 hover:text-emerald-300 border-emerald-800"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleReviewForm(f.id, 'REJECTED')}
                              className="text-xs py-1 px-2.5 text-red-400 hover:text-red-300 border-red-800"
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        /* TAB 3: Semester Results & Marksheets */
        <div className="space-y-6">
          {results.map((res) => (
            <Card
              key={res.id}
              title={`Semester ${res.semester_number} Grade Report (${res.academic_year})`}
              subtitle={`${res.course_name} • ${res.examination_name}`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => handleDownloadMarksheet(res.id, res.roll_number || 'student', res.semester_number)}
                  className="text-xs py-1.5 px-3"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Official Marksheet PDF
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">Semester SGPA</p>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">{res.sgpa.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">Cumulative CGPA</p>
                    <p className="text-xl font-bold text-cyan-400 mt-0.5">{res.cgpa.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">Total Percentage</p>
                    <p className="text-xl font-bold text-white mt-0.5">{res.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">Final Result</p>
                    <p className="text-xl font-bold text-emerald-400 mt-0.5">{res.result_status}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3 text-center">Credits</th>
                        <th className="py-2.5 px-3 text-center">Internal</th>
                        <th className="py-2.5 px-3 text-center">External</th>
                        <th className="py-2.5 px-3 text-center">Total</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3 text-center">Points</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {res.subjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-[#111827]/40 transition">
                          <td className="py-2.5 px-3 font-mono text-cyan-400 font-medium">{sub.subject_code}</td>
                          <td className="py-2.5 px-3 text-slate-200 font-medium">{sub.subject_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{sub.credits}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{sub.internal_marks}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{sub.external_marks}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{sub.total_marks}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">{sub.grade}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{sub.grade_point}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pay Exam Fee Modal */}
      {isPaymentModalOpen && examForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" /> Pay Examination Fee
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate:</span>
                <span className="text-white font-bold">{examForm.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Fee:</span>
                <span className="text-emerald-400 font-bold">₹1,500.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway:</span>
                <span className="text-cyan-400">CampusX Pay Secure</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / QR' },
                  { id: 'NET_BANKING', label: 'Net Banking' },
                  { id: 'DEBIT_CARD', label: 'Debit Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                      paymentMethod === m.id
                        ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                        : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-[11px] text-cyan-300">
              <b>Important:</b> Payment alone does NOT approve the form. Your exam registration will still undergo
              administrative verification by the Examination Cell.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePayFee} disabled={payingFee}>
                {payingFee ? 'Processing Payment...' : 'Confirm & Pay ₹1,500'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default ExaminationsPage;
